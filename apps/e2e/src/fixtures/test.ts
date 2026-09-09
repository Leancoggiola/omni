import { test as base, expect, request } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

import { ADMIN, WEB_URL, WORKER_PASSWORD, workerUsername } from '../support/env';

export interface WorkerUser {
  username: string;
  password: string;
  name: string;
}

const AUTH_DIR = new URL('../../.auth/', import.meta.url);

/**
 * Cada worker de Playwright trabaja con su propio usuario, así los tests corren en paralelo
 * sin pisarse los datos. Sin esto habría que serializar la suite entera.
 */
export const test = base.extend<object, { workerUser: WorkerUser; workerStorageState: string }>({
  workerUser: [
    async ({}, use, workerInfo) => {
      const user: WorkerUser = {
        username: workerUsername(workerInfo.workerIndex),
        password: WORKER_PASSWORD,
        name: `Worker ${workerInfo.workerIndex}`,
      };

      // Se pega a la web para pasar por el proxy de Vite, igual que lo haría el browser.
      const api = await request.newContext({ baseURL: WEB_URL });

      const adminLogin = await api.post('/api/auth/login', { data: ADMIN });
      expect(
        adminLogin.ok(),
        'No se pudo iniciar sesión como admin. Revisá que ADMIN_USERNAME y ADMIN_PASSWORD ' +
          'de apps/api/.env.e2e coincidan con ADMIN de src/support/env.ts.'
      ).toBeTruthy();

      const created = await api.post('/api/admin/users', {
        data: { username: user.username, name: user.name, password: user.password },
      });
      expect(created.ok(), `No se pudo crear el usuario del worker: ${await created.text()}`).toBeTruthy();

      await api.dispose();
      await use(user);
    },
    { scope: 'worker' },
  ],

  workerStorageState: [
    async ({ workerUser }, use, workerInfo) => {
      const api = await request.newContext({ baseURL: WEB_URL });
      const login = await api.post('/api/auth/login', {
        data: { username: workerUser.username, password: workerUser.password },
      });
      expect(login.ok(), 'No se pudo iniciar sesión con el usuario del worker').toBeTruthy();

      await mkdir(AUTH_DIR, { recursive: true });
      const path = new URL(`worker-${workerInfo.workerIndex}.json`, AUTH_DIR);
      await writeFile(path, JSON.stringify(await api.storageState()));
      await api.dispose();

      await use(path.pathname.slice(1));
    },
    { scope: 'worker' },
  ],

  storageState: ({ workerStorageState }, use) => use(workerStorageState),
});

export { expect };
