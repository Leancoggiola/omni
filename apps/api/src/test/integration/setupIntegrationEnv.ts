import { loadTestEnv } from './testDatabaseUrl';

// Corre antes de que cualquier test importe common/db/prisma, que lee DATABASE_URL al importarse.
loadTestEnv();
