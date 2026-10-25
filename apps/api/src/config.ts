import 'dotenv/config';

function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return value;
}

const DEFAULT_RATE_LIMIT_GLOBAL_MAX = 300;

/** Único algoritmo con el que se firman y aceptan los JWT: fijarlo en la verificación impide que el token elija otro. */
export const JWT_ALGORITHM = 'HS256';

/**
 * En producción la API solo debe responder a través del proxy de Vercel: sin secreto el guard no actuaría
 * y la API quedaría abierta sin que nadie se entere, así que falla al arrancar. Fuera de producción es opcional.
 */
export function resolveOriginSecret(raw: string | undefined, isProduction: boolean): string | undefined {
  const secret = raw?.trim() || undefined;
  if (isProduction && !secret) {
    throw new Error(
      'ORIGIN_SECRET es obligatorio en producción: tiene que coincidir con el header x-origin-secret que agrega el proxy de Vercel'
    );
  }
  return secret;
}

const JWT_SECRET_MIN_LENGTH = 32;

/** Tope de vigencia de un token: más allá la fecha de vencimiento se sale del rango de `Date`. */
const TOKEN_TTL_MAX_MS = 3650 * 24 * 60 * 60 * 1000;

const DURATION_UNIT_MS = { s: 1000, m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 } as const;

/**
 * Convierte la duración de un token (`15m`, `7d`, `2h`, `90s` o un entero de segundos) a milisegundos. Es el único
 * formato que acepta la API: un valor que `jsonwebtoken` no entienda rompería el login recién al emitir el primer token.
 */
export function parseDurationMs(raw: string, name: string): number {
  const value = raw.trim();
  const match = /^(\d+)([smhd])?$/.exec(value);
  const amount = match ? Number(match[1]) : 0;
  const unitMs = match ? DURATION_UNIT_MS[(match[2] ?? 's') as keyof typeof DURATION_UNIT_MS] : 0;
  if (!match || amount <= 0 || amount * unitMs > TOKEN_TTL_MAX_MS) {
    throw new Error(
      `${name} inválido: usá un entero positivo de hasta 3650d con unidad s, m, h o d (por ejemplo 15m o 7d)`
    );
  }
  return amount * unitMs;
}

interface JwtEnv {
  accessSecret: string;
  refreshSecret: string;
  accessExpiresIn: string | undefined;
  refreshExpiresIn: string | undefined;
  mobileRefreshExpiresIn?: string | undefined;
}

/**
 * Secretos y vigencias de los JWT. En producción los secretos tienen que ser largos y distintos entre sí: con el mismo
 * secreto un refresh token valdría como access token. La vigencia de cada token es la única fuente de su cookie y de su
 * `expiresAt`: salen de `accessTtlMs` y `refreshTtlMs` (web). El refresh token de la app mobile, que no usa cookies,
 * vale `mobileRefreshTtlMs` (90 días por defecto) desde cada refresh: la sesión vence recién tras ese tiempo sin uso.
 */
export function resolveJwtConfig(env: JwtEnv, isProduction: boolean) {
  if (isProduction) {
    for (const [name, secret] of [
      ['JWT_ACCESS_SECRET', env.accessSecret],
      ['JWT_REFRESH_SECRET', env.refreshSecret],
    ] as const) {
      if (secret.length < JWT_SECRET_MIN_LENGTH) {
        throw new Error(`${name} tiene que tener al menos ${JWT_SECRET_MIN_LENGTH} caracteres en producción`);
      }
    }
    if (env.accessSecret === env.refreshSecret) {
      throw new Error('JWT_ACCESS_SECRET y JWT_REFRESH_SECRET tienen que ser distintos en producción');
    }
  }

  return {
    accessSecret: env.accessSecret,
    refreshSecret: env.refreshSecret,
    accessTtlMs: parseDurationMs(env.accessExpiresIn ?? '15m', 'JWT_ACCESS_EXPIRES_IN'),
    refreshTtlMs: parseDurationMs(env.refreshExpiresIn ?? '7d', 'JWT_REFRESH_EXPIRES_IN'),
    mobileRefreshTtlMs: parseDurationMs(env.mobileRefreshExpiresIn ?? '90d', 'JWT_REFRESH_EXPIRES_IN_MOBILE'),
  };
}

/**
 * La API autentica contra TMDB con `Authorization: Bearer`, que solo acepta el "API Read Access Token" (un JWT). Una
 * API key v3 (32 caracteres hexadecimales) haría fallar toda búsqueda con 502 recién en runtime, así que en producción
 * el arranque la rechaza y el deploy no reemplaza a la instancia que sí funciona.
 */
export function resolveTmdbApiKey(raw: string, isProduction: boolean): string {
  if (isProduction && /^[0-9a-f]{32}$/i.test(raw.trim())) {
    throw new Error(
      'TMDB_API_KEY parece una API key v3: usá el "API Read Access Token" (v4) de themoviedb.org/settings/api'
    );
  }
  return raw;
}

/** Un valor inválido daría `NaN` y dejaría el limiter roto: cualquier cosa que no sea un entero positivo usa el default. */
export function resolveRateLimitGlobalMax(raw: string | undefined): number {
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : DEFAULT_RATE_LIMIT_GLOBAL_MAX;
}

export const config = {
  port: parseInt(process.env.PORT ?? '3000', 10),
  databaseUrl: required('DATABASE_URL'),
  corsOrigin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:5173'],
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProduction: process.env.NODE_ENV === 'production',

  jwt: resolveJwtConfig(
    {
      accessSecret: required('JWT_ACCESS_SECRET'),
      refreshSecret: required('JWT_REFRESH_SECRET'),
      accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN,
      refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
      mobileRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN_MOBILE,
    },
    process.env.NODE_ENV === 'production'
  ),

  /** Secreto que agrega el proxy de Vercel en `x-origin-secret`. Obligatorio en producción; fuera de ella, sin definir, el origin guard no actúa. */
  originSecret: resolveOriginSecret(process.env.ORIGIN_SECRET, process.env.NODE_ENV === 'production'),

  /** `globalMax` es por ventana de 15 min: 300 por defecto para que la revalidación de SWR no lo agote en una sesión normal. */
  rateLimit: {
    disabled: process.env.RATE_LIMIT_DISABLED === 'true' && process.env.NODE_ENV !== 'production',
    globalMax: resolveRateLimitGlobalMax(process.env.RATE_LIMIT_GLOBAL_MAX),
  },

  tmdb: {
    apiKey: resolveTmdbApiKey(required('TMDB_API_KEY'), process.env.NODE_ENV === 'production'),
    baseUrl: process.env.TMDB_BASE_URL ?? 'https://api.themoviedb.org/3',
  },

  /** La política de uso de Wikimedia exige identificar al cliente con un contacto en el `userAgent`. */
  wikipedia: {
    baseUrl: process.env.WIKIPEDIA_BASE_URL ?? 'https://es.wikipedia.org/api/rest_v1',
    userAgent: process.env.WIKIPEDIA_USER_AGENT ?? 'Omni/1.0 (https://github.com/Leancoggiola/omni)',
  },
} as const;
