import { randomUUID } from 'node:crypto';

import { expect, test } from '../src/fixtures/test';
import { AdminPage } from '../src/pages/AdminPage';
import { createUserViaAdmin } from '../src/support/adminApi';
import { ADMIN, WORKER_PASSWORD } from '../src/support/env';

/** usernameSchema: 6-20 alfanuméricos. Único por llamada porque todos los workers comparten la lista. */
function uniqueUsername(prefix: string): string {
  return `${prefix}${randomUUID().replace(/-/g, '').slice(0, 10)}`.toLowerCase();
}

test.describe('administración: usuario sin permisos', () => {
  test('no ve el ítem del navbar y /admin redirige al home', async ({ page, workerUser }) => {
    const admin = new AdminPage(page);
    await page.goto('/');
    await expect(page.getByRole('navigation').getByText(workerUser.name)).toBeVisible();
    await expect(admin.navItem()).toBeHidden();

    await admin.goto();

    await expect(page).toHaveURL('/');
    await expect(admin.title()).toBeHidden();
  });
});

test.describe('administración: ADMIN', () => {
  test.beforeEach(async ({ loginAsAdmin }) => {
    await loginAsAdmin();
  });

  test('ve el ítem en el navbar y llega a la pantalla', async ({ page }) => {
    const admin = new AdminPage(page);
    await page.goto('/');

    await admin.navItem().click();

    await expect(page).toHaveURL('/admin');
    await expect(admin.title()).toBeVisible();
  });

  test('crea un usuario y aparece en la lista', async ({ page }) => {
    const admin = new AdminPage(page);
    const username = uniqueUsername('e2ecrea');
    await admin.goto();
    await admin.openCreateModal();
    await expect(admin.submitButton()).toBeDisabled();

    await admin.fillForm({
      username,
      name: 'Usuario Creado',
      email: `${username}@example.com`,
      password: WORKER_PASSWORD,
    });
    await admin.submitButton().click();

    await expect(admin.createdNotification()).toBeVisible();
    await expect(admin.modal()).toBeHidden();
    const row = admin.rowOf(username);
    await expect(row).toBeVisible();
    await expect(row).toContainText('Usuario Creado');
    await expect(row).toContainText(`@${username} · ${username}@example.com`);
    await expect(row.getByText('Usuario', { exact: true })).toBeVisible();
    await expect(row).toContainText(/Alta \d{2}\/\d{2}\/\d{4}/);
    await expect(admin.deleteButtonOf(username)).toBeVisible();
  });

  test('muestra un error si el username ya está en uso', async ({ page }) => {
    const admin = new AdminPage(page);
    const existing = await createUserViaAdmin({
      username: uniqueUsername('e2edup'),
      name: 'Ya Existe',
      password: WORKER_PASSWORD,
    });
    await admin.goto();

    await admin.createUser({ username: existing.username, name: 'Otro Nombre', password: WORKER_PASSWORD });

    await expect(admin.modalError()).toContainText('El nombre de usuario ya está en uso');
    await expect(admin.modal()).toBeVisible();
  });

  test('rechaza una confirmación de contraseña que no coincide', async ({ page }) => {
    const admin = new AdminPage(page);
    await admin.goto();

    await admin.createUser({
      username: uniqueUsername('e2epass'),
      name: 'Sin Coincidir',
      password: WORKER_PASSWORD,
      confirmPassword: 'otra-contrasena-distinta',
    });

    await expect(admin.modal().getByText('Las contraseñas no coinciden')).toBeVisible();
    await expect(admin.createdNotification()).toBeHidden();
  });

  test('elimina un usuario después de confirmar', async ({ page }) => {
    const admin = new AdminPage(page);
    const user = await createUserViaAdmin({
      username: uniqueUsername('e2edel'),
      name: 'Para Eliminar',
      password: WORKER_PASSWORD,
    });
    await admin.goto();
    await expect(admin.rowOf(user.username)).toBeVisible();

    await admin.deleteUser(user.username);

    await expect(admin.deletedNotification()).toBeVisible();
    await expect(admin.rowOf(user.username)).toBeHidden();
  });

  test('conserva al usuario si se cancela la confirmación', async ({ page }) => {
    const admin = new AdminPage(page);
    const user = await createUserViaAdmin({
      username: uniqueUsername('e2ekeep'),
      name: 'Se Queda',
      password: WORKER_PASSWORD,
    });
    await admin.goto();

    await admin.deleteButtonOf(user.username).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Cancelar' }).click();

    await expect(admin.rowOf(user.username)).toBeVisible();
  });

  test('la fila del administrador no tiene botón de eliminar', async ({ page }) => {
    const admin = new AdminPage(page);
    await admin.goto();

    const row = admin.rowOf(ADMIN.username);
    await expect(row).toBeVisible();
    await expect(row).toContainText('Administrador');
    await expect(admin.deleteButtonOf(ADMIN.username)).toBeHidden();
    await expect(row.getByRole('button')).toHaveCount(0);
  });
});
