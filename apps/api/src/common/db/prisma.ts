import { PrismaClient } from '../../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

/** Cliente real. Los tests de integración lo usan directo para abrir la transacción que después revierten. */
export const basePrisma = new PrismaClient({ adapter });

export type PrismaTransactionClient = Omit<
  PrismaClient,
  '$transaction' | '$connect' | '$disconnect' | '$on' | '$extends'
>;

let override: PrismaTransactionClient | null = null;

export function setPrismaOverride(client: PrismaTransactionClient): void {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('setPrismaOverride is only available when NODE_ENV is "test"');
  }
  override = client;
}

export function clearPrismaOverride(): void {
  override = null;
}

export function getPrismaOverride(): PrismaTransactionClient | null {
  return override;
}

// Prisma saca $transaction del cliente interactivo, así las llamadas anidadas corren sobre la misma tx.
function flattenTransaction(tx: PrismaTransactionClient) {
  return (arg: unknown) =>
    typeof arg === 'function'
      ? (arg as (client: PrismaTransactionClient) => unknown)(tx)
      : Promise.all(arg as Promise<unknown>[]);
}

function resolve(target: PrismaClient | PrismaTransactionClient, prop: string | symbol) {
  const value = Reflect.get(target, prop, target) as unknown;
  return typeof value === 'function' ? value.bind(target) : value;
}

/**
 * Delega en la transacción de test activa si hay una, y si no en el cliente real.
 * Permite que los tests de integración reviertan toda escritura sin que ningún service reciba un cliente inyectado.
 */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    if (override) {
      return prop === '$transaction' ? flattenTransaction(override) : resolve(override, prop);
    }
    return resolve(basePrisma, prop);
  },
});
