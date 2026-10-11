import 'dotenv/config';

function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return value;
}

export const config = {
  port: parseInt(process.env.PORT ?? '3000', 10),
  databaseUrl: required('DATABASE_URL'),
  corsOrigin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:5173'],
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProduction: process.env.NODE_ENV === 'production',

  jwt: {
    accessSecret: required('JWT_ACCESS_SECRET'),
    refreshSecret: required('JWT_REFRESH_SECRET'),
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  },

  cookie: {
    refreshMaxAge: parseInt(process.env.COOKIE_REFRESH_MAX_AGE ?? '604800', 10) * 1000,
  },

  /** Secreto que agrega el proxy de Vercel en `x-origin-secret`. Sin definir, el origin guard no actúa. */
  originSecret: process.env.ORIGIN_SECRET || undefined,

  /** `globalMax` es por ventana de 15 min: 300 por defecto para que la revalidación de SWR no lo agote en una sesión normal. */
  rateLimit: {
    disabled: process.env.RATE_LIMIT_DISABLED === 'true' && process.env.NODE_ENV !== 'production',
    globalMax: parseInt(process.env.RATE_LIMIT_GLOBAL_MAX ?? '300', 10),
  },

  tmdb: {
    apiKey: required('TMDB_API_KEY'),
    baseUrl: process.env.TMDB_BASE_URL ?? 'https://api.themoviedb.org/3',
  },

  /** La política de uso de Wikimedia exige identificar al cliente con un contacto en el `userAgent`. */
  wikipedia: {
    baseUrl: process.env.WIKIPEDIA_BASE_URL ?? 'https://es.wikipedia.org/api/rest_v1',
    userAgent: process.env.WIKIPEDIA_USER_AGENT ?? 'Omni/1.0 (https://github.com/Leancoggiola/omni)',
  },
} as const;
