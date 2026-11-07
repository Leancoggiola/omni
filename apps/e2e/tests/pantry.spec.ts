import { expect, test } from '../src/fixtures/test';
import { PantryPage } from '../src/pages/PantryPage';

test.describe('pantry', () => {
  test('alta de un producto bajo de stock, generar la lista, comprarlo y destildarlo', async ({ page, freshUser }) => {
    await freshUser('alacena');
    const pantry = new PantryPage(page);
    await pantry.goto();

    await pantry.addProduct('Leche entera', 'Lácteos', '1', '2');

    await expect(page.getByRole('alert').filter({ hasText: 'Producto agregado' })).toBeVisible();
    await expect(pantry.dialog()).toBeHidden();
    await expect(pantry.rowOf('Leche entera')).toContainText('Bajo stock');

    await pantry.shoppingTab().click();
    await pantry.generateButton().click();
    await expect(pantry.dialog()).toContainText('Comprar 1 unidad');
    await pantry.confirmGenerateButton().click();
    await expect(page.getByRole('alert').filter({ hasText: 'Lista generada' })).toBeVisible();

    await pantry.checkboxOf('Leche entera').click();
    await expect(pantry.uncheckOf('Leche entera')).toBeChecked();

    await pantry.uncheckOf('Leche entera').click();
    await expect(pantry.checkboxOf('Leche entera')).not.toBeChecked();
  });

  test('edita un producto con el stepper y Guardar se habilita recién con cambios', async ({ page, freshUser }) => {
    await freshUser('editar');
    const pantry = new PantryPage(page);
    await pantry.goto();
    await pantry.createViaApi({ name: 'Arroz', category: 'GRAINS', unit: 'UNITS', quantity: 3 });
    await page.reload();

    await pantry.editButtonOf('Arroz').click();
    await expect(pantry.saveChangesButton()).toBeDisabled();
    await pantry.addOneButton().click();
    await pantry.saveChangesButton().click();

    await expect(page.getByRole('alert').filter({ hasText: 'Producto actualizado' })).toBeVisible();
    await expect(pantry.rowOf('Arroz')).toContainText('4 unidades');
  });

  test('busca sin resultados y elimina un producto después de confirmar', async ({ page, freshUser }) => {
    await freshUser('borrar');
    const pantry = new PantryPage(page);
    await pantry.goto();
    await pantry.createViaApi({ name: 'Fideos', category: 'GRAINS', unit: 'PACKAGES', quantity: 2 });
    await page.reload();

    await pantry.searchField().fill('zzz');
    await expect(page.getByText('Sin resultados para «zzz»')).toBeVisible();
    await pantry.searchField().clear();

    await pantry.deleteButtonOf('Fideos').click();
    await page.getByRole('button', { name: 'Eliminar', exact: true }).click();

    await expect(page.getByRole('alert').filter({ hasText: 'Producto eliminado' })).toBeVisible();
    await expect(page.getByText('Tu alacena está vacía')).toBeVisible();
  });

  test('muestra el error con reintento cuando falla la carga', async ({ page, freshUser }) => {
    await freshUser('error');
    const pantry = new PantryPage(page);
    await page.route('**/api/pantry/products*', route =>
      route.fulfill({ status: 500, contentType: 'application/json', body: '{"message":"boom"}' })
    );
    await pantry.goto();

    await expect(page.getByText('No se pudo cargar tu alacena')).toBeVisible();
    await expect(page.getByText('Tu alacena está vacía')).toBeHidden();

    await page.unroute('**/api/pantry/products*');
    await pantry.retryButton().click();

    await expect(page.getByText('Tu alacena está vacía')).toBeVisible();
  });
});
