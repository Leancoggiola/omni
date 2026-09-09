import { PrismaClient } from '../../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

/** Real client. Integration tests use it directly to open the transaction they later roll back. */
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

// Prisma strips $transaction from the interactive client, so nested calls run on the same tx.
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
 * Delegates to the active test transaction when one is set, otherwise to the real client.
 * Lets integration tests roll back every write without any service taking an injected client.
 */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    if (override) {
      return prop === '$transaction' ? flattenTransaction(override) : resolve(override, prop);
    }
    return resolve(basePrisma, prop);
  },
});
