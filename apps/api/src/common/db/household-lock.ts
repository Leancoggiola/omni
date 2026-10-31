import type { PrismaTransactionClient } from './prisma';

/**
 * Serializa por hogar toda transacción que cambia sus integrantes (invitar, unirse, desvincular, borrar la cuenta).
 * Sin esto, dos uniones simultáneas leerían "queda un lugar" y el hogar terminaría con tres personas. Con varios hogares
 * los locks se toman en orden de id para que dos transacciones cruzadas no se bloqueen entre sí.
 */
export async function lockHouseholds(tx: PrismaTransactionClient, householdIds: string[]) {
  for (const id of [...new Set(householdIds)].sort()) {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`household:${id}`}))`;
  }
}
