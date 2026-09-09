import { loadTestEnv } from './testDatabaseUrl';

// Runs before any test file imports common/db/prisma, which reads DATABASE_URL at import time.
loadTestEnv();
