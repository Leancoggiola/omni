import { expect, test } from '../src/fixtures/test';
import { HomePage } from '../src/pages/HomePage';
import { LoginPage } from '../src/pages/LoginPage';

const SCHEME_ATTR = 'data-mantine-color-scheme';

/**
 * El toggle guarda el tema en sessionStorage y pisa al del perfil hasta el logout, la sesión
 * expirada o el cierre de la pestaña. Usuario propio: el tema del perfil arranca en 'light'.
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

  test('al cerrar sesión y volver a entrar se aplica el tema del perfil', async ({ page, freshUser }) => {
    const user = await freshUser('themelogout');
    const home = new HomePage(page);
    await home.goto();
    await home.toggleTheme();
    await expect(home.documentRoot()).toHaveAttribute(SCHEME_ATTR, 'dark');

    await home.logout();
    await expect(page).toHaveURL('/login');
    await new LoginPage(page).login(user.username, user.password);

    await expect(page).toHaveURL('/');
    await expect(home.documentRoot()).toHaveAttribute(SCHEME_ATTR, 'light');
  });
});
