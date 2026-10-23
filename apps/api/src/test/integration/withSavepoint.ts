import { getPrismaOverride } from '../../common/db/prisma';

let counter = 0;

/**
 * Ejecuta `fn` dentro de un savepoint y siempre revierte hasta él.
 *
 * Postgres aborta la transacción entera ante un error de base de datos (por ejemplo, una
 * violación de constraint), lo que envenenaría toda query posterior del test. Envolvé la
 * request que provoca el error. Todo lo que `fn` haya escrito se descarta.
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
