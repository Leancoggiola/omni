import { spawnSync } from 'node:child_process';

import { loadTestEnv } from './testDatabaseUrl';

const url = loadTestEnv();
const cwd = new URL('../../../', import.meta.url);

const result = spawnSync('prisma', ['migrate', 'reset', '--force'], {
  stdio: 'inherit',
  cwd,
  shell: true,
  env: { ...process.env, DATABASE_URL: url, DIRECT_URL: url },
});

process.exit(result.status ?? 1);
