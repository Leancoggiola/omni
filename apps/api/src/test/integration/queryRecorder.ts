import type { PrismaTransactionClient } from '../../common/db/prisma';

export interface RecordedCall {
  /** Nombre del delegate tal como se usa en el cliente, por ejemplo `gathering`. */
  model: string;
  operation: string;
  args: Record<string, unknown> | undefined;
}

const calls: RecordedCall[] = [];

export function getRecordedCalls(): readonly RecordedCall[] {
  return calls;
}

export function resetRecordedCalls(): void {
  calls.length = 0;
}

export function findRecordedCall(model: string, operation: string): RecordedCall | undefined {
  return calls.find(call => call.model === model && call.operation === operation);
}

function isModelDelegate(prop: string | symbol, value: unknown): prop is string {
  return (
    typeof prop === 'string' &&
    !prop.startsWith('$') &&
    !prop.startsWith('_') &&
    typeof value === 'object' &&
    value !== null
  );
}

/**
 * Envuelve un cliente transaccional para registrar cada llamada a un modelo antes de ejecutarla.
 * Permite assertear qué llegó realmente a Prisma, no solo cómo se vio la respuesta.
 */
export function recordingProxy(tx: PrismaTransactionClient): PrismaTransactionClient {
  return new Proxy(tx, {
    get(target, prop) {
      const value = Reflect.get(target, prop, target) as unknown;

      if (!isModelDelegate(prop, value)) {
        return typeof value === 'function' ? value.bind(target) : value;
      }

      const model = prop;
      return new Proxy(value as object, {
        get(delegate, operation) {
          const method = Reflect.get(delegate, operation, delegate) as unknown;
          if (typeof method !== 'function' || typeof operation !== 'string') {
            return method;
          }
          return (...args: unknown[]) => {
            calls.push({ model, operation, args: args[0] as Record<string, unknown> | undefined });
            return (method as (...a: unknown[]) => unknown).apply(delegate, args);
          };
        },
      });
    },
  }) as PrismaTransactionClient;
}
