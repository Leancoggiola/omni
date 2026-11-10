import { expect, test } from '../src/fixtures/test';
import { PantryPage } from '../src/pages/PantryPage';
import { createUserViaAdmin, storageStateFor } from '../src/support/adminApi';
import { WEB_URL, WORKER_PASSWORD } from '../src/support/env';

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

  test('el alta valida la categoría y no cierra el modal', async ({ page, freshUser }) => {
    await freshUser('valida');
    const pantry = new PantryPage(page);
    await pantry.goto();

    await pantry.addProductButton().click();
    await expect(pantry.submitProductButton()).toBeDisabled();
    await pantry.nameField().fill('Sal');
    await pantry.quantityField().fill('2');
    await pantry.submitProductButton().click();

    await expect(pantry.dialog().getByText('Elegí una categoría')).toBeVisible();
    await expect(pantry.dialog()).toBeVisible();
  });

  test('filtra por alerta, por categoría y por búsqueda', async ({ page, freshUser }) => {
    await freshUser('filtros');
    const pantry = new PantryPage(page);
    await pantry.goto();
    const soon = new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10);
    await pantry.createViaApi({ name: 'Leche', category: 'DAIRY', unit: 'PACKAGES', quantity: 1, minQuantity: 2 });
    await pantry.createViaApi({ name: 'Pollo', category: 'MEAT', unit: 'UNITS', quantity: 5, expiresAt: soon });
    await pantry.createViaApi({ name: 'Arroz', category: 'GRAINS', unit: 'UNITS', quantity: 9 });
    await page.reload();

    await pantry.statCard('Bajo stock').click();
    await expect(pantry.rowOf('Leche')).toBeVisible();
    await expect(pantry.rowOf('Pollo')).toBeHidden();
    await pantry.statCard('Bajo stock').click();

    await pantry.statCard('Por vencer').click();
    await expect(pantry.rowOf('Pollo')).toContainText('Por vencer');
    await expect(pantry.rowOf('Arroz')).toBeHidden();
    await pantry.statCard('Por vencer').click();

    await pantry.categoryFilter().click();
    await page.getByRole('option', { name: 'Granos', exact: true }).click();
    await expect(pantry.rowOf('Arroz')).toBeVisible();
    await expect(pantry.rowOf('Leche')).toBeHidden();

    await pantry.searchField().fill('zzz');
    await expect(page.getByText('Sin resultados para «zzz»')).toBeVisible();
    await page.getByRole('button', { name: 'Limpiar filtros' }).click();
    await expect(pantry.rowOf('Leche')).toBeVisible();
  });

  test('conserva el producto si se cancela la baja', async ({ page, freshUser }) => {
    await freshUser('cancel');
    const pantry = new PantryPage(page);
    await pantry.goto();
    await pantry.createViaApi({ name: 'Yerba', category: 'BEVERAGES', unit: 'PACKAGES', quantity: 2 });
    await page.reload();

    await pantry.deleteButtonOf('Yerba').click();
    await expect(page.getByText('Esta acción no se puede deshacer.')).toBeVisible();
    await page.getByRole('button', { name: 'Cancelar' }).click();

    await expect(pantry.rowOf('Yerba')).toBeVisible();
  });

  test('elimina un producto desde el modal de detalle', async ({ page, freshUser }) => {
    await freshUser('detalle');
    const pantry = new PantryPage(page);
    await pantry.goto();
    await pantry.createViaApi({ name: 'Miel', category: 'CONDIMENTS', unit: 'UNITS', quantity: 1 });
    await page.reload();

    await pantry.editButtonOf('Miel').click();
    await pantry.dialog().getByRole('button', { name: 'Eliminar' }).click();
    const confirmDialog = page.getByRole('dialog', { name: '¿Eliminar Miel?' });
    await expect(confirmDialog).toBeVisible();
    await confirmDialog.getByRole('button', { name: 'Eliminar' }).click();

    await expect(page.getByRole('alert').filter({ hasText: 'Producto eliminado' })).toBeVisible();
    await expect(pantry.dialog()).toHaveCount(0);
    await expect(page.getByText('Tu alacena está vacía')).toBeVisible();
  });

  test('un ítem libre se compra eligiendo categoría y crea el producto en la alacena', async ({ page, freshUser }) => {
    await freshUser('libre');
    const pantry = new PantryPage(page);
    await pantry.goto();
    await pantry.openShopping();
    await expect(page.getByText('Tu lista está vacía')).toBeVisible();

    await pantry.itemNameField().fill('Café molido');
    await pantry.itemQuantityField().fill('2');
    await pantry.addItemButton().click();
    await expect(page.getByRole('alert').filter({ hasText: 'Agregado a la lista' })).toBeVisible();

    await pantry.checkboxOf('Café molido').click();
    await expect(pantry.purchaseButton()).toBeDisabled();
    await pantry.purchaseCategoryField().click();
    await page.getByRole('option', { name: 'Bebidas', exact: true }).click();
    await pantry.purchaseButton().click();

    await expect(page.getByRole('alert').filter({ hasText: 'Marcado como comprado' })).toBeVisible();
    await expect(pantry.uncheckOf('Café molido')).toBeChecked();

    await pantry.inventoryTab().click();
    await expect(pantry.rowOf('Café molido')).toContainText('2 unidades');
  });

  test('un ítem vinculado a un producto se compra al instante y suma al stock', async ({ page, freshUser }) => {
    await freshUser('vinculo');
    const pantry = new PantryPage(page);
    await pantry.goto();
    await pantry.createViaApi({ name: 'Fideos', category: 'GRAINS', unit: 'PACKAGES', quantity: 1, minQuantity: 2 });
    await page.reload();
    await pantry.openShopping();

    await pantry.itemNameField().fill('Fid');
    await page.getByRole('option', { name: 'Fideos' }).click();
    await pantry.addItemButton().click();
    await expect(pantry.checkboxOf('Fideos')).toBeVisible();
    await expect(page.getByText('En alacena: 1 paquete')).toBeVisible();

    await pantry.checkboxOf('Fideos').click();
    await expect(page.getByRole('alert').filter({ hasText: 'Marcado como comprado' })).toBeVisible();
    await expect(pantry.dialog()).toBeHidden();

    await pantry.inventoryTab().click();
    await expect(pantry.rowOf('Fideos')).toContainText('2 paquetes');
  });

  test('edita la cantidad de un ítem, lo quita y limpia los comprados', async ({ page, freshUser }) => {
    await freshUser('items');
    const pantry = new PantryPage(page);
    await pantry.goto();
    await pantry.createItemViaApi({ name: 'Detergente', quantityToBuy: 1, unit: 'UNITS' });
    await pantry.createItemViaApi({ name: 'Esponja', quantityToBuy: 1, unit: 'UNITS' });
    await pantry.openShopping();

    await pantry.editItemButtonOf('Detergente').click();
    await expect(pantry.saveItemButton()).toBeDisabled();
    await pantry.editItemQuantityField().fill('3');
    await pantry.saveItemButton().click();
    await expect(page.getByRole('alert').filter({ hasText: 'Ítem actualizado' })).toBeVisible();
    await expect(page.getByText('Comprar 3 unidades')).toBeVisible();

    await pantry.removeItemButtonOf('Esponja').click();
    await page.getByRole('button', { name: 'Quitar', exact: true }).click();
    await expect(pantry.checkboxOf('Esponja')).toBeHidden();

    await pantry.checkboxOf('Detergente').click();
    await pantry.purchaseCategoryField().click();
    await page.getByRole('option', { name: 'Limpieza', exact: true }).click();
    await pantry.purchaseButton().click();
    await expect(pantry.uncheckOf('Detergente')).toBeChecked();

    await pantry.clearCheckedButton().click();
    await expect(page.getByRole('alert').filter({ hasText: 'Comprados limpiados' })).toBeVisible();
    await expect(pantry.uncheckOf('Detergente')).toBeHidden();
  });

  test('el banner de bajo stock genera la lista y actualiza el contador de la pestaña', async ({ page, freshUser }) => {
    await freshUser('banner');
    const pantry = new PantryPage(page);
    await pantry.goto();
    await pantry.createViaApi({ name: 'Aceite', category: 'CONDIMENTS', unit: 'UNITS', quantity: 0, minQuantity: 3 });
    await page.reload();
    await pantry.openShopping();

    await expect(page.getByText('1 producto con bajo stock.')).toBeVisible();
    await pantry.generateButton().click();
    await expect(pantry.dialog()).toContainText('Comprar 3 unidades');
    await pantry.confirmGenerateButton().click();

    await expect(page.getByText('Auto', { exact: true })).toBeVisible();
    await expect(page.getByLabel('1 pendientes')).toBeVisible();
  });

  test('si falla la lista de compras muestra el error con reintento', async ({ page, freshUser }) => {
    await freshUser('listerr');
    const pantry = new PantryPage(page);
    await page.route('**/api/pantry/shopping-list', route =>
      route.fulfill({ status: 500, contentType: 'application/json', body: '{"message":"boom"}' })
    );
    await page.goto('/pantry?tab=shopping');

    await expect(page.getByText('No se pudo cargar tu lista de compras')).toBeVisible();
    await expect(page.getByText('Tu lista está vacía')).toBeHidden();

    await page.unroute('**/api/pantry/shopping-list');
    await pantry.retryButton().click();
    await expect(page.getByText('Tu lista está vacía')).toBeVisible();
  });

  test('muestra el estado de carga mientras la API responde', async ({ page, freshUser }) => {
    await freshUser('carga');
    const pantry = new PantryPage(page);
    await page.route('**/api/pantry/products*', async route => {
      await new Promise(resolve => setTimeout(resolve, 1500));
      await route.continue();
    });
    await pantry.goto();

    await expect(page.getByRole('status', { name: 'Cargando' })).toBeVisible();
    await expect(page.getByText('Tu alacena está vacía')).toBeVisible();
  });

  test('en un hogar compartido cada persona ve lo del otro y quién lo agregó', async ({
    page,
    freshUser,
    browser,
  }, testInfo) => {
    test.setTimeout(60_000);
    await freshUser('hogar');
    const pantry = new PantryPage(page);
    await pantry.goto();
    await pantry.createViaApi({ name: 'Queso', category: 'DAIRY', unit: 'PACKAGES', quantity: 1 });
    await expect(pantry.rowOf('Queso')).toBeVisible();
    const invite = await page.request.post('/api/household/invite');
    const { code } = await invite.json();

    const partner = await createUserViaAdmin({
      username: `e2epareja${testInfo.workerIndex}${Date.now() % 100000}`.slice(0, 20),
      password: WORKER_PASSWORD,
      name: 'Ana Pareja',
    });
    const context = await browser.newContext({ baseURL: WEB_URL, storageState: await storageStateFor(partner) });
    const accepted = await context.request.post('/api/household/invite/accept', { data: { code } });
    expect(accepted.ok()).toBeTruthy();

    const partnerPage = await context.newPage();
    const partnerPantry = new PantryPage(partnerPage);
    await partnerPantry.goto();
    await expect(partnerPantry.rowOf('Queso')).toBeVisible();
    await partnerPantry.editButtonOf('Queso').click();
    await expect(partnerPantry.dialog().getByRole('group', { name: /Agregado por Fresh hogar/ })).toBeVisible();
    await partnerPage.keyboard.press('Escape');

    await partnerPantry.createItemViaApi({ name: 'Sal fina', quantityToBuy: 1, unit: 'UNITS' });
    await page.reload();
    await pantry.openShopping();
    await expect(pantry.checkboxOf('Sal fina')).toBeVisible();
    await expect(page.getByRole('group', { name: 'Agregado por Ana Pareja' })).toBeVisible();
    await expect(page.getByText('Se actualiza solo cada 20 s')).toBeVisible();

    await partnerPantry.openShopping();
    await expect(partnerPantry.checkboxOf('Sal fina')).toBeVisible();
    await pantry.updateItemViaApi('Sal fina', { quantityToBuy: 3 });
    await expect(partnerPage.getByText('Editado por Fresh hogar')).toBeVisible({ timeout: 25_000 });
    await expect(partnerPage.getByText('Comprar 3 unidades')).toBeVisible();

    await context.close();
  });

  test('sin vincular no se muestra autoría ni el aviso de actualización', async ({ page, freshUser }) => {
    await freshUser('solo');
    const pantry = new PantryPage(page);
    await pantry.goto();
    await pantry.createViaApi({ name: 'Queso', category: 'DAIRY', unit: 'PACKAGES', quantity: 1 });
    await pantry.createItemViaApi({ name: 'Sal fina', quantityToBuy: 1, unit: 'UNITS' });
    const householdLoaded = page.waitForResponse(res => res.url().endsWith('/api/household'));
    await page.reload();
    await householdLoaded;

    await pantry.editButtonOf('Queso').click();
    await expect(pantry.dialog()).toBeVisible();
    await expect(pantry.dialog().getByText('Agregado por')).toBeHidden();
    await page.keyboard.press('Escape');

    await pantry.openShopping();
    await expect(pantry.checkboxOf('Sal fina')).toBeVisible();
    await expect(page.getByRole('group', { name: /Agregado por/ })).toBeHidden();
    await expect(page.getByText(/Se actualiza solo/)).toBeHidden();
  });

  test('en un celular se puede usar la alacena', async ({ page, freshUser }) => {
    await freshUser('movil');
    const pantry = new PantryPage(page);
    await page.setViewportSize({ width: 375, height: 812 });
    await pantry.goto();
    await pantry.createViaApi({ name: 'Té', category: 'BEVERAGES', unit: 'UNITS', quantity: 4 });
    await page.reload();

    await expect(pantry.rowOf('Té')).toBeVisible();
    await expect(pantry.addProductButton()).toBeVisible();
    const { scrollWidth, clientWidth } = await pantry.pageWidths();
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 0.5);
  });
});
