import type { PrismaTransactionClient } from './prisma';

/**
 * Serializa por usuario toda transacción que escribe en su gimnasio. El catálogo se comparte entre planes y días, así que
 * "buscar la variante o crearla", mover un ejercicio de día o borrar la última fila que usa una variante tocan las mismas
 * filas desde planes distintos: sin esto, dos altas simultáneas chocan con los únicos y un borrado puede llevarse la
 * variante que otro alta ya encontró. La clave lleva prefijo porque `lockUserSessions` ya usa el id pelado.
 */
export async function lockGymUser(tx: PrismaTransactionClient, userId: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`gym:${userId}`}))`;
}
