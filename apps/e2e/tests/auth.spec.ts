import { expect, test } from '../src/fixtures/test';
import { LoginPage } from '../src/pages/LoginPage';

test.describe('sesión ya iniciada', () => {
  test('reutiliza el storageState del worker sin volver a loguearse', async ({ page, workerUser }) => {
    await page.goto('/');

    await expect(page).toHaveURL('/');
    await expect(page.getByRole('navigation').getByText(workerUser.name)).toBeVisible();
  });
});

test.describe('sin sesión', () => {
  test.use({ storageState: undefined });

  test('redirige al login al entrar a una ruta protegida', async ({ page }) => {
    await page.goto('/media');

    await expect(page).toHaveURL('/login');
  });

  for (const width of [375, 320]) {
    test(`el login no tiene scroll horizontal a ${width} px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 812 });
      const login = new LoginPage(page);
      await login.goto();
      await expect(login.submit()).toBeVisible();

      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
      const box = await login.submit().boundingBox();
      expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    });
  }

  test('muestra un error con credenciales inválidas', async ({ page, workerUser }) => {
    const login = new LoginPage(page);
    await login.goto();

    await login.login(workerUser.username, 'contrasenaincorrecta');

    await expect(login.error()).toBeVisible();
    await expect(page).toHaveURL('/login');
  });

  test('inicia sesión y llega al home', async ({ page, workerUser }) => {
    const login = new LoginPage(page);
    await login.goto();

    await login.login(workerUser.username, workerUser.password);

    await expect(page).toHaveURL('/');
    await expect(page.getByRole('navigation').getByText(workerUser.name)).toBeVisible();
  });

  test('vuelve a la ruta pedida después de iniciar sesión', async ({ page, workerUser }) => {
    await page.goto('/media');
    await expect(page).toHaveURL('/login');

    await new LoginPage(page).login(workerUser.username, workerUser.password);

    await expect(page).toHaveURL('/media');
  });

  test('cierra sesión y vuelve al login', async ({ page, workerUser }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.login(workerUser.username, workerUser.password);
    await expect(page).toHaveURL('/');

    await page.getByRole('button', { name: 'Cerrar sesión' }).click();

    await expect(page).toHaveURL('/login');
  });
});
