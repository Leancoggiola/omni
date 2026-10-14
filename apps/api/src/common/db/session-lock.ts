import type { PrismaTransactionClient } from './prisma';

/**
 * Serializa por usuario toda transacción que escribe sus refresh tokens (login, refresh, logout, cambio de
 * contraseña). Sin esto, con READ COMMITTED, una revocación no ve la fila que otra transacción está rotando.
 */
export async function lockUserSessions(tx: PrismaTransactionClient, userId: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}))`;
}
