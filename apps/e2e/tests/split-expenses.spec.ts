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

    // Ana pagó todo, así que Bruno le debe la mitad.
    const settlements = page.getByText('¿Quién le debe a quién?').locator('..');
    await expect(settlements).toContainText('Bruno');
    await expect(settlements).toContainText('Ana');
    await expect(settlements).toContainText('$5.000,00');
  });

  test('marca la juntada como saldada', async ({ page, freshUser }) => {
    await freshUser('sal');
    const split = new SplitExpensesPage(page);
    await split.goto();
    await split.createGathering('Cumpleaños', ['Ana', 'Bruno']);
    await split.ensureExpanded('Cumpleaños');

    await split.settleButton().click();

    await expect(page.getByText('Saldado')).toBeVisible();
    // Al saldarla, la juntada se contrae sola.
    await split.expandButton().click();
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
