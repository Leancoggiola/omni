import { test as base, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { createUserViaAdmin, storageStateFor, type NewUser } from '../support/adminApi';
import { ADMIN, RUN_SUFFIX, WORKER_PASSWORD, workerUsername } from '../support/env';

export type WorkerUser = NewUser;

const AUTH_DIR = new URL(`../../.auth${RUN_SUFFIX}/`, import.meta.url);

// PNG de 1x1 transparente.
const PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

interface Fixtures {
  /** Crea un usuario nuevo y deja su sesión activa. Para tests que no toleran datos previos. */
  freshUser: (label: string) => Promise<NewUser>;
  /** Reemplaza la sesión del contexto por la del ADMIN del seed. No crea ni modifica usuarios. */
  loginAsAdmin: () => Promise<void>;
}

interface WorkerFixtures {
  workerUser: WorkerUser;
  workerStorageState: string;
}

let freshUserCount = 0;

/**
 * Cada worker de Playwright trabaja con su propio usuario, así los tests corren en paralelo
 * sin pisarse los datos. Sin esto habría que serializar la suite entera.
 */
export const test = base.extend<Fixtures, WorkerFixtures>({
  workerUser: [
    async ({}, use, workerInfo) => {
      await use(
        await createUserViaAdmin({
          username: workerUsername(workerInfo.workerIndex),
          password: WORKER_PASSWORD,
          name: `Worker ${workerInfo.workerIndex}`,
        })
      );
    },
    { scope: 'worker' },
  ],

  workerStorageState: [
    async ({ workerUser }, use, workerInfo) => {
      await mkdir(AUTH_DIR, { recursive: true });
      const path = new URL(`worker-${workerInfo.workerIndex}.json`, AUTH_DIR);
      await writeFile(path, JSON.stringify(await storageStateFor(workerUser)));
      await use(fileURLToPath(path));
    },
    { scope: 'worker' },
  ],

  storageState: ({ workerStorageState }, use) => use(workerStorageState),

  freshUser: async ({ page }, use, testInfo) => {
    await use(async (label: string) => {
      freshUserCount += 1;
      const user = await createUserViaAdmin({
        username: `e2e${label}${testInfo.workerIndex}${freshUserCount}`.toLowerCase().slice(0, 20),
        password: WORKER_PASSWORD,
        name: `Fresh ${label} ${freshUserCount}`,
      });
      const { cookies } = await storageStateFor(user);
      await page.context().clearCookies();
      await page.context().addCookies(cookies);
      return user;
    });
  },

  loginAsAdmin: async ({ page }, use) => {
    await use(async () => {
      const { cookies } = await storageStateFor(ADMIN);
      await page.context().clearCookies();
      await page.context().addCookies(cookies);
    });
  },

  // Los posters salen a image.tmdb.org. Sin esto la suite depende de internet y, peor,
  // MediaCard reemplaza la imagen por un ícono cuando falla y el lightbox deja de abrirse.
  page: async ({ page }, use) => {
    await page.route('https://image.tmdb.org/**', route => route.fulfill({ contentType: 'image/png', body: PIXEL }));
    await use(page);
  },
});

export { expect };
