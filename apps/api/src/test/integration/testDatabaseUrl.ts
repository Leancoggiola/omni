import dotenv from 'dotenv';

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

const ENV_TEST_PATH = new URL('../../../.env.test', import.meta.url);

/**
 * Refuses anything that is not a local, disposable database.
 *
 * `prisma.config.ts` resolves `DIRECT_URL ?? DATABASE_URL` after loading `.env`, so a
 * `migrate reset` run with the dev environment in scope would drop the real Supabase data.
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
  const isTestDatabase = database.endsWith('_test');

  if (!isLocal || !isTestDatabase) {
    throw new Error(
      [
        'Refusing to run against a non-test database.',
        `  host:     ${parsed.hostname} ${isLocal ? '(ok)' : '(must be localhost or 127.0.0.1)'}`,
        `  database: ${database} ${isTestDatabase ? '(ok)' : '(must end in _test)'}`,
        '',
        'Start the disposable container and retry:',
        '  docker compose up -d db-test',
      ].join('\n')
    );
  }

  return rawUrl;
}

/**
 * Loads `.env.test` over whatever is already in the environment and validates the result.
 * Must run before anything imports `common/db/prisma`, which reads DATABASE_URL at import time.
 */
export function loadTestEnv(): string {
  dotenv.config({ path: ENV_TEST_PATH, override: true, quiet: true });
  return assertTestDatabaseUrl(process.env.DATABASE_URL);
}
