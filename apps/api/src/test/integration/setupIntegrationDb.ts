import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest';

import { basePrisma, clearPrismaOverride, setPrismaOverride } from '../../common/db/prisma';
import { recordingProxy, resetRecordedCalls } from './queryRecorder';

const ROLLBACK = Symbol('integration-rollback');

let rollback: (() => void) | null = null;
let transaction: Promise<unknown> | null = null;

beforeAll(async () => {
  await basePrisma.$connect();
});

// Cada test corre dentro de una transacción que nunca se commitea, así la base queda
// idéntica antes y después. Requiere fileParallelism: false — el override es estado de módulo.
beforeEach(async () => {
  resetRecordedCalls();

  let ready: () => void;
  const started = new Promise<void>(resolve => {
    ready = resolve;
  });

  transaction = basePrisma
    .$transaction(
      async tx => {
        setPrismaOverride(recordingProxy(tx));
        ready();
        await new Promise<never>((_, reject) => {
          rollback = () => reject(ROLLBACK);
        });
      },
      { maxWait: 10_000, timeout: 30_000 }
    )
    .catch((err: unknown) => {
      if (err !== ROLLBACK) throw err;
    });

  await started;
});

afterEach(async () => {
  clearPrismaOverride();
  rollback?.();
  rollback = null;
  await transaction;
  transaction = null;
});

afterAll(async () => {
  await basePrisma.$disconnect();
});
