import { getPrismaOverride } from '../../common/db/prisma';

let counter = 0;

/**
 * Runs `fn` inside a savepoint and always rolls back to it.
 *
 * Postgres aborts the whole transaction on a database-level error (a unique constraint
 * violation, for example), which would poison every later query in the test. Wrap the
 * request that triggers the error. Anything `fn` wrote is discarded.
 */
export async function withSavepoint<T>(fn: () => Promise<T>): Promise<T> {
  const tx = getPrismaOverride();
  if (!tx) {
    throw new Error('withSavepoint requires an active integration transaction');
  }

  const name = `sp_${++counter}`;
  await tx.$executeRawUnsafe(`SAVEPOINT ${name}`);
  try {
    return await fn();
  } finally {
    await tx.$executeRawUnsafe(`ROLLBACK TO SAVEPOINT ${name}`);
  }
}
