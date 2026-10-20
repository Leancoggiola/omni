import { expect, test } from '../src/fixtures/test';
import { SplitExpensesPage } from '../src/pages/SplitExpensesPage';

test.describe('amigos guardados', () => {
  test('guarda un amigo con alias válido', async ({ page }) => {
    const split = new SplitExpensesPage(page);
    await split.goto();
    await split.openFriends();

    await split.submitFriend('Ana Valida', 'ana.valida');

    await expect(page.getByText('Ana Valida')).toBeVisible();
    await expect(page.getByText('ana.valida')).toBeVisible();
  });

  test('rechaza un alias más corto que el mínimo', async ({ page }) => {
    const split = new SplitExpensesPage(page);
    await split.goto();
    await split.openFriends();

    await split.submitFriend('Alias Corto', 'abc');

    await expect(page.getByText('El alias debe tener al menos 6 caracteres')).toBeVisible();
    await expect(page.getByText('Alias Corto')).toBeHidden();
  });

  test('rechaza un alias con caracteres no permitidos', async ({ page }) => {
    const split = new SplitExpensesPage(page);
    await split.goto();
    await split.openFriends();

    await split.submitFriend('Alias Raro', 'ana bella!');

    await expect(
      page.getByText('El alias solo puede tener letras, números, puntos, guiones y guiones bajos')
    ).toBeVisible();
  });

  test('no deja escribir un alias más largo que el máximo', async ({ page }) => {
    const split = new SplitExpensesPage(page);
    await split.goto();
    await split.openFriends();

    await split.friendAliasField().pressSequentially('a'.repeat(25));

    await expect(split.friendAliasField()).toHaveValue('a'.repeat(20));
  });
});

test.describe('juntadas', () => {
  test('crea una juntada con participantes', async ({ page, freshUser }) => {
    await freshUser('gat');
    const split = new SplitExpensesPage(page);
    await split.goto();

    await split.createGathering('Asado del sábado', ['Ana', 'Bruno']);

    await expect(page.getByText('Asado del sábado')).toBeVisible();
    await expect(page.getByText('2 participantes')).toBeVisible();
  });

  test('agrega un gasto y calcula la liquidación', async ({ page, freshUser }) => {
    await freshUser('liq');
    const split = new SplitExpensesPage(page);
    await split.goto();
    await split.createGathering('Cena', ['Ana', 'Bruno']);
    await split.ensureExpanded('Cena');

    await split.addExpense('Ana', '10000', 'Carne');

    await expect(page.getByText('Carne')).toBeVisible();
    await expect(page.getByText('Total: $10.000,00')).toBeVisible();

    const settlements = split.settlements();
    await expect(settlements).toContainText('Bruno');
    await expect(settlements).toContainText('Ana');
    await expect(settlements).toContainText('$5.000,00');
  });

  test('pide confirmación antes de eliminar un gasto', async ({ page, freshUser }) => {
    await freshUser('gasto');
    const split = new SplitExpensesPage(page);
    await split.goto();
    await split.createGathering('Parrilla', ['Ana', 'Bruno']);
    await split.ensureExpanded('Parrilla');
    await split.addExpense('Ana', '4000', 'Chorizos');
    await expect(page.getByText('Chorizos')).toBeVisible();

    await split.deleteExpenseButton().click();
    await expect(page.getByText('Esta acción no se puede deshacer.')).toBeVisible();
    await page.getByRole('button', { name: 'Cancelar' }).click();
    await expect(page.getByText('Chorizos')).toBeVisible();

    await split.deleteExpenseButton().click();
    await page.getByRole('button', { name: 'Eliminar', exact: true }).click();
    await expect(page.getByText('Chorizos')).toBeHidden();
  });

  test('si falla la carga de juntadas, Reintentar la recupera', async ({ page, freshUser }) => {
    await freshUser('retry');
    let failing = true;
    await page.route('**/api/split-expenses/gatherings?*', route =>
      failing
        ? route.fulfill({ status: 500, contentType: 'application/json', body: '{"message":"boom"}' })
        : route.continue()
    );
    const split = new SplitExpensesPage(page);
    await split.goto();
    await expect(page.getByRole('alert').filter({ hasText: 'No se pudieron cargar las juntadas' })).toBeVisible();

    failing = false;
    await split.retryButton().click();

    await expect(page.getByText('Todavía no tenés juntadas')).toBeVisible();
    await expect(page.getByRole('alert')).toBeHidden();
  });

  test('marca la juntada como saldada', async ({ page, freshUser }) => {
    await freshUser('sal');
    const split = new SplitExpensesPage(page);
    await split.goto();
    await split.createGathering('Cumpleaños', ['Ana', 'Bruno']);
    await split.ensureExpanded('Cumpleaños');

    await split.settleButton().click();

    await expect(page.getByText('Saldado')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Marcar como pendiente' })).toBeVisible();
  });

  test('elimina la juntada desde el menú de opciones', async ({ page, freshUser }) => {
    await freshUser('del');
    const split = new SplitExpensesPage(page);
    await split.goto();
    await split.createGathering('Picada', ['Ana', 'Bruno']);
    await expect(page.getByText('Picada')).toBeVisible();

    await split.optionsButton().click();
    await page.getByRole('menuitem', { name: 'Eliminar juntada' }).click();
    await page.getByRole('button', { name: 'Eliminar', exact: true }).click();

    await expect(page.getByText('Picada')).toBeHidden();
  });
});
