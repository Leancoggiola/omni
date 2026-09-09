import dotenv from 'dotenv';

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

const DISPOSABLE_SUFFIXES = ['_test', '_e2e'];

/**
 * Rechaza cualquier cosa que no sea una base local y descartable.
 *
 * `prisma.config.ts` resuelve `DIRECT_URL ?? DATABASE_URL` después de cargar `.env`, así que
 * un `migrate reset` con el entorno de dev en scope borraría los datos reales de Supabase.
 */
export function assertTestDatabaseUrl(rawUrl: string | undefined): string {
  if (!rawUrl) {
    throw new Error('DATABASE_URL is not set. Expected apps/api/.env.test to define it.');
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error(`DATABASE_URL is not a valid URL: ${rawUrl}`);
  }

  const database = parsed.pathname.replace(/^\//, '');
  const isLocal = LOCAL_HOSTNAMES.has(parsed.hostname);
  const isDisposable = DISPOSABLE_SUFFIXES.some(suffix => database.endsWith(suffix));

  if (!isLocal || !isDisposable) {
    throw new Error(
      [
        'Refusing to run against a non-test database.',
        `  host:     ${parsed.hostname} ${isLocal ? '(ok)' : '(must be localhost or 127.0.0.1)'}`,
        `  database: ${database} ${isDisposable ? '(ok)' : '(must end in _test or _e2e)'}`,
        '',
        'Start the disposable container and retry:',
        '  docker compose up -d db-test db-e2e',
      ].join('\n')
    );
  }

  return rawUrl;
}

/**
 * Carga el archivo de entorno indicado por encima de lo que ya haya en el proceso y lo valida.
 * Tiene que correr antes de que algo importe `common/db/prisma`, que lee DATABASE_URL al importarse.
 */
export function loadTestEnv(fileName = '.env.test'): string {
  dotenv.config({ path: new URL(`../../../${fileName}`, import.meta.url), override: true, quiet: true });
  return assertTestDatabaseUrl(process.env.DATABASE_URL);
}
