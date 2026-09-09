import { spawnSync } from 'node:child_process';

import { loadTestEnv } from './testDatabaseUrl';

const [envFile = '.env.test'] = process.argv.slice(2).filter(arg => !arg.startsWith('--'));
const withSeed = process.argv.includes('--seed');

const url = loadTestEnv(envFile);
const cwd = new URL('../../../', import.meta.url);
const env = { ...process.env, DATABASE_URL: url, DIRECT_URL: url };

function runPrisma(args: string[]) {
  return spawnSync('prisma', args, { stdio: 'inherit', cwd, shell: true, env }).status ?? 1;
}

let status = runPrisma(['migrate', 'reset', '--force']);

// Prisma 7 ya no siembra como parte de migrate reset.
if (status === 0 && withSeed) {
  status = runPrisma(['db', 'seed']);
}

process.exit(status);
