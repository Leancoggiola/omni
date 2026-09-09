import { expect, request } from '@playwright/test';

import { ADMIN, WEB_URL } from './env';

export interface NewUser {
  username: string;
  name: string;
  password: string;
}

/**
 * No hay endpoint público de registro, así que los usuarios de prueba se crean
 * como lo haría un admin real. La suite nunca escribe en la base directamente.
 */
export async function createUserViaAdmin(user: NewUser): Promise<NewUser> {
  // Se pega a la web para pasar por el proxy de Vite, igual que lo haría el browser.
  const api = await request.newContext({ baseURL: WEB_URL });

  const adminLogin = await api.post('/api/auth/login', { data: ADMIN });
  expect(
    adminLogin.ok(),
    'No se pudo iniciar sesión como admin. Revisá que ADMIN_USERNAME y ADMIN_PASSWORD ' +
      'de apps/api/.env.e2e coincidan con ADMIN de src/support/env.ts.'
  ).toBeTruthy();

  const created = await api.post('/api/admin/users', { data: user });
  expect(created.ok(), `No se pudo crear el usuario ${user.username}: ${await created.text()}`).toBeTruthy();

  await api.dispose();
  return user;
}

/** Devuelve el storageState de una sesión iniciada con ese usuario. */
export async function storageStateFor(user: NewUser) {
  const api = await request.newContext({ baseURL: WEB_URL });
  const login = await api.post('/api/auth/login', {
    data: { username: user.username, password: user.password },
  });
  expect(login.ok(), `No se pudo iniciar sesión con ${user.username}`).toBeTruthy();

  const state = await api.storageState();
  await api.dispose();
  return state;
}
