/**
 * Valores compartidos por la config de Playwright y los fixtures.
 * Las credenciales del admin deben coincidir con `apps/api/.env.e2e`, que es lo que consume el seed.
 */

/**
 * Puertos de la suite. `E2E_PORT_OFFSET` los corre en bloque (web 5173, API 3000, stub 3199) para que dos
 * copias del repo (worktrees, sesiones) puedan correr E2E a la vez. Hay que acompañarlo con `DB_E2E_PORT`,
 * la base de cada copia (ver docs/tooling/e2e.md). Sin variables, los valores son los de siempre.
 */
const PORT_OFFSET = Number(process.env.E2E_PORT_OFFSET ?? 0);
if (!Number.isInteger(PORT_OFFSET) || PORT_OFFSET < 0 || PORT_OFFSET > 1000) {
  throw new Error(`E2E_PORT_OFFSET inválido: "${process.env.E2E_PORT_OFFSET}". Usá un entero entre 0 y 1000.`);
}

const DB_E2E_PORT = process.env.DB_E2E_PORT;
if (PORT_OFFSET !== 0 && !DB_E2E_PORT) {
  throw new Error(
    'Con E2E_PORT_OFFSET hay que definir también DB_E2E_PORT: sin eso la suite compartiría db-e2e (5434) con la otra copia.'
  );
}

/** Sufijo para carpetas de salida (sesiones, reportes, artefactos) que dos corridas simultáneas no pueden compartir. */
export const RUN_SUFFIX = PORT_OFFSET === 0 ? '' : `-${PORT_OFFSET}`;

export const WEB_PORT = 5173 + PORT_OFFSET;
export const API_PORT = 3000 + PORT_OFFSET;
export const STUB_PORT = 3199 + PORT_OFFSET;

export const WEB_URL = `http://localhost:${WEB_PORT}`;
export const API_URL = `http://localhost:${API_PORT}`;
/** Stub de TMDB + Wikipedia (src/support/externalStub.mjs). */
export const EXTERNAL_STUB_URL = `http://127.0.0.1:${STUB_PORT}`;

const databaseUrl = `postgresql://postgres:postgres@127.0.0.1:${DB_E2E_PORT}/omni_e2e`;

/**
 * Entorno de la API de E2E. `dev:e2e` carga apps/api/.env.e2e con --env-file, que no pisa lo que ya está
 * en el entorno, así que esto manda y los valores del archivo quedan como default.
 */
export const API_ENV: Record<string, string> = {
  PORT: String(API_PORT),
  CORS_ORIGIN: WEB_URL,
  TMDB_BASE_URL: EXTERNAL_STUB_URL,
  WIKIPEDIA_BASE_URL: EXTERNAL_STUB_URL,
  // Con override de la base, el archivo .env.e2e se pisa; sin él manda el archivo.
  ...(DB_E2E_PORT ? { DATABASE_URL: databaseUrl, DIRECT_URL: databaseUrl } : {}),
};

/** Entorno de Vite: puerto propio y proxy hacia la API de esta copia (ver apps/web/vite.config.ts). */
export const WEB_ENV: Record<string, string> = {
  WEB_PORT: String(WEB_PORT),
  API_PORT: String(API_PORT),
};

export const ADMIN = {
  username: 'e2eadmin',
  password: 'e2eadminpassword',
};

/** usernameSchema exige 6-20 caracteres alfanuméricos, sin guiones ni guiones bajos. */
export function workerUsername(workerIndex: number): string {
  return `e2eworker${workerIndex}`;
}

export const WORKER_PASSWORD = 'e2eworkerpassword';
