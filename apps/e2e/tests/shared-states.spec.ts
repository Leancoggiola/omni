import { expect, test } from '../src/fixtures/test';

/**
 * Estados compartidos de `@/shared/ui`. Se verifican sobre `media` porque es la pantalla
 * donde los tres conviven, pero el componente es el mismo en toda la app.
 */
test.describe('estados compartidos', () => {
  test('muestra el estado vacío cuando la lista no tiene items', async ({ page, freshUser }) => {
    await freshUser('empty');

    await page.goto('/media');

    await expect(page.getByText('Tu lista está vacía')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Agregar' }).last()).toBeVisible();
  });

  test('muestra el estado de error cuando la API falla', async ({ page }) => {
    await page.route('**/api/media/list', route =>
      route.fulfill({ status: 500, contentType: 'application/json', body: '{"message":"boom"}' })
    );

    await page.goto('/media');

    await expect(page.getByRole('alert').filter({ hasText: 'No se pudo cargar tu lista' })).toBeVisible();
    await expect(page.getByText('Tu lista está vacía')).toBeHidden();
  });

  test('muestra el estado de carga mientras la API responde', async ({ page }) => {
    let release: () => void = () => {};
    const pending = new Promise<void>(resolve => {
      release = resolve;
    });

    await page.route('**/api/media/list', async route => {
      await pending;
      await route.continue();
    });

    await page.goto('/media');

    await expect(page.getByRole('status', { name: 'Cargando' })).toBeVisible();
    release();
    await expect(page.getByRole('status', { name: 'Cargando' })).toBeHidden();
  });
});
