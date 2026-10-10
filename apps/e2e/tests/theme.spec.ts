import { expect, test } from '../src/fixtures/test';
import { HomePage } from '../src/pages/HomePage';
import { LoginPage } from '../src/pages/LoginPage';
import { ProfilePage } from '../src/pages/ProfilePage';

const SCHEME_ATTR = 'data-mantine-color-scheme';

/**
 * El toggle guarda el tema en sessionStorage y pisa al del perfil hasta el próximo login o el cierre
 * de la pestaña; el logout y la sesión expirada lo conservan para que /login cargue con ese tema.
 * Usuario propio: el tema del perfil arranca en 'light'.
 */
test.describe('tema por sesión', () => {
  test('el tema elegido con el toggle sobrevive a la recarga', async ({ page, freshUser }) => {
    await freshUser('theme');
    const home = new HomePage(page);
    await home.goto();
    await expect(home.documentRoot()).toHaveAttribute(SCHEME_ATTR, 'light');

    await home.toggleTheme();
    await expect(home.documentRoot()).toHaveAttribute(SCHEME_ATTR, 'dark');

    await page.reload();

    await expect(home.themeToggle()).toHaveAccessibleName('Cambiar a tema claro');
    await expect(home.documentRoot()).toHaveAttribute(SCHEME_ATTR, 'dark');
  });

  test('al cerrar sesión el login conserva el tema; al volver a entrar se aplica el del perfil', async ({
    page,
    freshUser,
  }) => {
    const user = await freshUser('themelogout');
    const home = new HomePage(page);
    await home.goto();
    await home.toggleTheme();
    await expect(home.documentRoot()).toHaveAttribute(SCHEME_ATTR, 'dark');

    await home.logout();
    await expect(page).toHaveURL('/login');
    await expect(home.documentRoot()).toHaveAttribute(SCHEME_ATTR, 'dark');
    await new LoginPage(page).login(user.username, user.password);

    await expect(page).toHaveURL('/');
    await expect(home.documentRoot()).toHaveAttribute(SCHEME_ATTR, 'light');
  });

  test.describe('guardado del perfil', () => {
    test('guardar el tema en el perfil descarta el override del toggle', async ({ page, freshUser }) => {
      await freshUser('themesave');
      // 'Sistema' resuelve contra el esquema del SO: se fija en claro para que el resultado sea
      // distinto del override (oscuro) y el test no dependa de la máquina.
      await page.emulateMedia({ colorScheme: 'light' });
      const home = new HomePage(page);
      const profile = new ProfilePage(page);
      await home.goto();
      await home.toggleTheme();
      await expect(home.documentRoot()).toHaveAttribute(SCHEME_ATTR, 'dark');

      await profile.goto();
      await profile.selectTheme('Sistema');
      await profile.save();

      await expect(profile.savedNotification()).toBeVisible();
      await expect(home.documentRoot()).toHaveAttribute(SCHEME_ATTR, 'light');

      // Si el override siguiera en sessionStorage, la recarga volvería a oscuro.
      await page.reload();
      await expect(profile.themeSelect()).toHaveValue('Sistema');
      await expect(home.documentRoot()).toHaveAttribute(SCHEME_ATTR, 'light');

      // Y es 'Sistema' de verdad, no un claro fijo: sigue al esquema del SO.
      await page.emulateMedia({ colorScheme: 'dark' });
      await expect(home.documentRoot()).toHaveAttribute(SCHEME_ATTR, 'dark');
    });

    test('guardar el teléfono no toca el override del toggle', async ({ page, freshUser }) => {
      await freshUser('themephone');
      const home = new HomePage(page);
      const profile = new ProfilePage(page);
      await home.goto();
      await home.toggleTheme();
      await expect(home.documentRoot()).toHaveAttribute(SCHEME_ATTR, 'dark');

      await profile.goto();
      await expect(profile.themeSelect()).toHaveValue('Claro');
      await profile.phoneField().fill('+54 11 4444 4444');
      await profile.save();

      await expect(profile.savedNotification()).toBeVisible();
      await expect(home.documentRoot()).toHaveAttribute(SCHEME_ATTR, 'dark');

      await page.reload();
      await expect(profile.phoneField()).toHaveValue('+54 11 4444 4444');
      await expect(home.documentRoot()).toHaveAttribute(SCHEME_ATTR, 'dark');
    });

    test('guardar las notificaciones no toca el override del toggle', async ({ page, freshUser }) => {
      // Pasa por PATCH /api/users/preferences, el mismo endpoint que guarda el tema.
      await freshUser('themenotif');
      const home = new HomePage(page);
      const profile = new ProfilePage(page);
      await home.goto();
      await home.toggleTheme();
      await expect(home.documentRoot()).toHaveAttribute(SCHEME_ATTR, 'dark');

      await profile.goto();
      await expect(profile.notificationsSwitch()).not.toBeChecked();
      await profile.toggleNotifications();
      await profile.save();

      await expect(profile.savedNotification()).toBeVisible();
      await expect(home.documentRoot()).toHaveAttribute(SCHEME_ATTR, 'dark');

      await page.reload();
      await expect(profile.notificationsSwitch()).toBeChecked();
      await expect(profile.themeSelect()).toHaveValue('Claro');
      await expect(home.documentRoot()).toHaveAttribute(SCHEME_ATTR, 'dark');
    });
  });

  /**
   * Sin cookies el browser no manda ni el access ni el refresh token: es lo mismo que ve la app cuando
   * vencen. El siguiente request da 401, el refresh silencioso también, y AuthContext cierra la sesión.
   */
  test.describe('sesión expirada', () => {
    test('con la pestaña abierta: vuelve al login con el tema y el login descarta el override', async ({
      page,
      freshUser,
    }) => {
      const user = await freshUser('themeexp');
      const home = new HomePage(page);
      await home.goto();
      await home.toggleTheme();
      await expect(home.documentRoot()).toHaveAttribute(SCHEME_ATTR, 'dark');

      await page.context().clearCookies();
      // Navegación del lado del cliente: el estado en memoria sigue en oscuro, solo cambia el request.
      await home.navigateTo('Perfil');

      await expect(page).toHaveURL('/login');
      await expect(home.documentRoot()).toHaveAttribute(SCHEME_ATTR, 'dark');
      await new LoginPage(page).login(user.username, user.password);

      await expect(page).toHaveURL('/profile');
      await expect(home.themeToggle()).toHaveAccessibleName('Cambiar a tema oscuro');
      await expect(home.documentRoot()).toHaveAttribute(SCHEME_ATTR, 'light');
    });

    test('al recargar: vuelve al login y descarta el override', async ({ page, freshUser }) => {
      const user = await freshUser('themeexpre');
      const home = new HomePage(page);
      await home.goto();
      await home.toggleTheme();
      await expect(home.documentRoot()).toHaveAttribute(SCHEME_ATTR, 'dark');

      await page.context().clearCookies();
      await page.reload();

      await expect(page).toHaveURL('/login');
      await expect(home.documentRoot()).toHaveAttribute(SCHEME_ATTR, 'dark');
      await new LoginPage(page).login(user.username, user.password);

      await expect(page).toHaveURL('/');
      await expect(home.themeToggle()).toHaveAccessibleName('Cambiar a tema oscuro');
      await expect(home.documentRoot()).toHaveAttribute(SCHEME_ATTR, 'light');
    });
  });

  test('el toggle de una pestaña no cambia el tema de otra', async ({ page, freshUser }) => {
    await freshUser('themetabs');
    // Mismo context = mismas cookies y mismo localStorage; sessionStorage es propio de cada pestaña.
    const other = await page.context().newPage();
    const home = new HomePage(page);
    const otherHome = new HomePage(other);
    await home.goto();
    await otherHome.goto();
    await expect(home.documentRoot()).toHaveAttribute(SCHEME_ATTR, 'light');
    await expect(otherHome.documentRoot()).toHaveAttribute(SCHEME_ATTR, 'light');

    await home.toggleTheme();
    await expect(home.documentRoot()).toHaveAttribute(SCHEME_ATTR, 'dark');

    // Sin recargar: no hay evento de storage que la sincronice.
    await expect(otherHome.themeToggle()).toHaveAccessibleName('Cambiar a tema oscuro');
    await expect(otherHome.documentRoot()).toHaveAttribute(SCHEME_ATTR, 'light');

    // Recargada: no hay nada persistido fuera del sessionStorage de la primera pestaña.
    await other.reload();
    await expect(otherHome.themeToggle()).toHaveAccessibleName('Cambiar a tema oscuro');
    await expect(otherHome.documentRoot()).toHaveAttribute(SCHEME_ATTR, 'light');

    // Y la primera conserva su override.
    await page.reload();
    await expect(home.themeToggle()).toHaveAccessibleName('Cambiar a tema claro');
    await expect(home.documentRoot()).toHaveAttribute(SCHEME_ATTR, 'dark');

    await other.close();
  });
});
