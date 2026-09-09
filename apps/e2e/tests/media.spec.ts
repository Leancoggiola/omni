import { expect, test } from '../src/fixtures/test';
import { MediaPage } from '../src/pages/MediaPage';

test.describe('media', () => {
  test('busca en TMDB y agrega el resultado a la lista', async ({ page }) => {
    const media = new MediaPage(page);
    await media.goto();

    await media.addFromSearch('Inception', 'Viendo');

    await expect(page.getByRole('alert').filter({ hasText: 'Agregado a tu lista' })).toBeVisible();
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(media.posterOf('Inception')).toBeVisible();
    await expect(media.statusOf('Inception')).toHaveValue('Viendo');
  });

  test('avisa cuando la búsqueda no encuentra nada', async ({ page }) => {
    const media = new MediaPage(page);
    await media.goto();

    await media.addButton().click();
    await media.searchField().fill('titulo inexistente');

    await expect(page.getByText('No se encontraron resultados')).toBeVisible();
  });

  test('cambia el estado de un item de la lista', async ({ page }) => {
    const media = new MediaPage(page);
    await media.goto();
    await media.addViaApi(603, 'movie');
    await expect(media.statusOf('The Matrix')).toHaveValue('Pendiente');

    await media.changeStatus('The Matrix', 'Vista');

    await expect(page.getByRole('alert').filter({ hasText: 'Estado actualizado' })).toBeVisible();
    await expect(media.statusOf('The Matrix')).toHaveValue('Vista');

    await page.reload();
    await expect(media.statusOf('The Matrix')).toHaveValue('Vista');
  });

  test('elimina un item después de confirmar', async ({ page }) => {
    const media = new MediaPage(page);
    await media.goto();
    await media.addViaApi(1396, 'tv');
    await expect(page.getByText('Breaking Bad')).toBeVisible();

    await media.startDelete('Breaking Bad');
    await expect(page.getByText('Esta acción no se puede deshacer.')).toBeVisible();
    await page.getByRole('button', { name: 'Eliminar', exact: true }).click();

    await expect(page.getByRole('alert').filter({ hasText: 'Eliminado de tu lista' })).toBeVisible();
    await expect(page.getByText('Breaking Bad')).toBeHidden();
  });

  test('conserva el item si se cancela la confirmación', async ({ page }) => {
    const media = new MediaPage(page);
    await media.goto();
    await media.addViaApi(13, 'movie');

    await media.startDelete('Forrest Gump');
    await page.getByRole('button', { name: 'Cancelar' }).click();

    await expect(page.getByText('Forrest Gump')).toBeVisible();
  });

  test('abre el poster en el lightbox', async ({ page }) => {
    const media = new MediaPage(page);
    await media.goto();
    await media.addViaApi(550, 'movie');

    await media.posterOf('Fight Club').click();

    const lightbox = page.getByRole('dialog');
    await expect(lightbox).toBeVisible();
    await expect(lightbox.getByRole('img', { name: 'Fight Club' })).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(lightbox).toBeHidden();
  });
});
