import { expect, test } from '../src/fixtures/test';
import { HomePage } from '../src/pages/HomePage';
import { LoginPage } from '../src/pages/LoginPage';
import { MediaPage } from '../src/pages/MediaPage';
import { ProfilePage } from '../src/pages/ProfilePage';
import { createUserViaAdmin } from '../src/support/adminApi';
import { WORKER_PASSWORD } from '../src/support/env';

import type { Page } from '@playwright/test';

/**
 * SWR junta dos pedidos de la misma key que llegan a menos de 2 s, y si el primero quedó viejo por un vaciado de
 * caché el segundo se queda sin datos. En el test los usuarios cambian más rápido de lo que lo haría una persona:
 * se adelanta el reloj del browser para que venza esa ventana sin esperar.
 */
const SWR_DEDUPE_MS = 2500;

/** Errores de JS no manejados (ej. un rechazo sin catch) que la app deja en la consola. */
function collectPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  return errors;
}

test.describe('cierre de sesión', () => {
  test('cierra la sesión con el access token vencido y revoca el refresh token', async ({ page, freshUser }) => {
    await freshUser('expired');
    const errors = collectPageErrors(page);
    const home = new HomePage(page);
    await home.goto();
    await expect(home.logoutButton()).toBeVisible();
    const refresh = (await page.context().cookies()).find(cookie => cookie.name === 'refresh_token');
    expect(refresh).toBeDefined();

    await page.context().clearCookies({ name: 'access_token' });
    await home.logout();

    await expect(page).toHaveURL('/login');
    expect(errors).toEqual([]);
    const reuse = await page.request.post('/api/auth/refresh', { data: { refreshToken: refresh!.value } });
    expect(reuse.status()).toBe(401);
  });

  test('cierra la sesión local aunque el logout falle', async ({ page, freshUser }) => {
    await freshUser('logoutfail');
    const errors = collectPageErrors(page);
    await page.route('**/api/auth/logout', route =>
      route.fulfill({ status: 503, contentType: 'application/json', body: '{"message":"Servicio no disponible"}' })
    );
    const home = new HomePage(page);
    await home.goto();

    await home.logout();

    await expect(page).toHaveURL('/login');
    expect(errors).toEqual([]);
  });
});

test.describe('eliminar cuenta', () => {
  test('limpia la sesión, va al login y la cuenta ya no existe', async ({ page, freshUser }) => {
    const user = await freshUser('delete');
    const errors = collectPageErrors(page);
    const profile = new ProfilePage(page);
    await profile.goto();

    await profile.deleteAccount();

    await expect(page).toHaveURL('/login');
    expect(errors).toEqual([]);
    const login = new LoginPage(page);
    await login.login(user.username, user.password);
    await expect(login.error()).toBeVisible();
    await expect(page).toHaveURL('/login');
  });

  test('muestra el error y conserva la sesión si el borrado falla', async ({ page, freshUser }) => {
    const user = await freshUser('deletefail');
    await page.route('**/api/users/account', route =>
      route.fulfill({ status: 500, contentType: 'application/json', body: '{"message":"No se pudo borrar"}' })
    );
    const profile = new ProfilePage(page);
    await profile.goto();
    await expect(profile.nameField()).toHaveValue(user.name);

    await profile.deleteAccount();

    await expect(page.getByRole('alert').filter({ hasText: 'No se pudo borrar' })).toBeVisible();
    await expect(page).toHaveURL('/profile');
    await expect(profile.nameField()).toHaveValue(user.name);
  });
});

test.describe('cambio de usuario en la misma pestaña', () => {
  test('el usuario nuevo no ve los datos cacheados del anterior', async ({ page, freshUser }) => {
    await freshUser('usera');
    const other = await createUserViaAdmin({
      username: `e2eusrb${Date.now() % 1e9}`,
      password: WORKER_PASSWORD,
      name: 'Usuario B',
    });
    const home = new HomePage(page);
    const media = new MediaPage(page);
    const profile = new ProfilePage(page);
    await page.clock.install();

    await media.goto();
    await media.addViaApi(603, 'movie');
    await expect(media.statusOf('The Matrix')).toBeVisible();
    const saved = await page.request.patch('/api/users/profile', { data: { phone: '+54 11 5555 5555' } });
    expect(saved.ok()).toBeTruthy();
    await home.navigateTo('Perfil');
    await expect(profile.phoneField()).toHaveValue('+54 11 5555 5555');

    await home.logout();
    await expect(page).toHaveURL('/login');
    await new LoginPage(page).login(other.username, other.password);
    await expect(page).toHaveURL('/');
    await page.clock.fastForward(SWR_DEDUPE_MS);

    await home.navigateTo('Películas');
    await expect(page.getByText('Tu lista está vacía')).toBeVisible();
    await expect(media.posterOf('The Matrix')).toBeHidden();
    await home.navigateTo('Perfil');
    await expect(profile.nameField()).toHaveValue('Usuario B');
    await expect(profile.phoneField()).toHaveValue('');
  });
});

test.describe('sesión que no se puede verificar', () => {
  test('muestra un error con reintento en vez de mandar al login', async ({ page, freshUser }) => {
    await freshUser('verify');
    let failing = true;
    await page.route('**/api/auth/profile', route =>
      failing
        ? route.fulfill({ status: 503, contentType: 'application/json', body: '{"message":"Servicio no disponible"}' })
        : route.continue()
    );

    await page.goto('/profile');

    await expect(page.getByRole('alert').filter({ hasText: 'No pudimos verificar tu sesión' })).toBeVisible();
    await expect(page).toHaveURL('/profile');

    failing = false;
    await page.getByRole('button', { name: 'Reintentar' }).click();

    await expect(new ProfilePage(page).nameField()).toBeVisible();
    await expect(page).toHaveURL('/profile');
  });
});
