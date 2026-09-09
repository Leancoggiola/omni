import { expect, test } from '../src/fixtures/test';
import { ProfilePage } from '../src/pages/ProfilePage';

test.describe('perfil', () => {
  test('guarda el teléfono y lo conserva al recargar', async ({ page, freshUser }) => {
    await freshUser('tel');
    const profile = new ProfilePage(page);
    await profile.goto();

    await profile.phoneField().fill('+54 11 5555 5555');
    await profile.saveButton().click();

    await expect(page.getByRole('alert').filter({ hasText: 'Listo' })).toBeVisible();
    await page.reload();
    await expect(profile.phoneField()).toHaveValue('+54 11 5555 5555');
  });

  test('cambia las preferencias de tema y notificaciones', async ({ page, freshUser }) => {
    await freshUser('pref');
    const profile = new ProfilePage(page);
    await profile.goto();
    await expect(profile.notificationsSwitch()).not.toBeChecked();

    await profile.toggleNotifications();
    await profile.themeSelect().click();
    await page.getByRole('option', { name: 'Oscuro', exact: true }).click();
    await profile.saveButton().click();

    await expect(page.getByRole('alert').filter({ hasText: 'Listo' })).toBeVisible();
    await page.reload();
    await expect(profile.notificationsSwitch()).toBeChecked();
    await expect(profile.themeSelect()).toHaveValue('Oscuro');
  });

  test('rechaza una confirmación de contraseña que no coincide', async ({ page, freshUser }) => {
    await freshUser('pwbad');
    const profile = new ProfilePage(page);
    await profile.goto();

    await profile.changePassword('contrasena-nueva-1', 'otra-cosa-distinta');

    await expect(page.getByText('Las contraseñas no coinciden')).toBeVisible();
  });

  test('cambia la contraseña y permite iniciar sesión con la nueva', async ({ page, freshUser }) => {
    const user = await freshUser('pwok');
    const profile = new ProfilePage(page);
    await profile.goto();
    const newPassword = 'contrasena-nueva-1';

    await profile.changePassword(newPassword);

    await expect(page.getByRole('alert').filter({ hasText: 'Listo' })).toBeVisible();

    const login = await page.request.post('/api/auth/login', {
      data: { username: user.username, password: newPassword },
    });
    expect(login.ok()).toBeTruthy();
  });
});
