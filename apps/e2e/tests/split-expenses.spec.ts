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
  test('crea una juntada con participantes y la deja elegida', async ({ page, freshUser }) => {
    await freshUser('gat');
    const split = new SplitExpensesPage(page);
    await split.goto();

    await split.createGathering('Asado del sábado', ['Ana', 'Bruno']);

    await expect(page.getByRole('heading', { name: 'Asado del sábado' })).toBeVisible();
    await expect(split.feed()).toContainText('3 personas');
    await expect(split.gatheringList()).toContainText('Activas');
    await expect(split.gatheringItem('Asado del sábado')).toHaveAttribute('aria-current', 'true');
  });

  test('suma a la juntada un amigo guardado desde su chip', async ({ page, freshUser }) => {
    await freshUser('chip');
    const split = new SplitExpensesPage(page);
    await split.goto();
    await split.openFriends();
    await split.submitFriend('Camila Chip', 'camila.chip');
    await expect(page.getByText('camila.chip')).toBeVisible();
    await page.keyboard.press('Escape');

    await split.openNewGathering('Cena con Camila');
    await split.friendChip('Camila Chip').click();
    await expect(split.friendCheckbox('Camila Chip')).toBeChecked();
    await split.createGatheringButton().click();

    await expect(split.feed()).toContainText('2 personas');
    await expect(split.balances()).toContainText('Camila Chip');
  });

  test('agrega un gasto, calcula la liquidación y resume el saldo propio', async ({ page, freshUser }) => {
    await freshUser('liq');
    const split = new SplitExpensesPage(page);
    await split.goto();
    await split.createGathering('Cena', ['Ana', 'Bruno']);

    await split.addExpense('Ana', '10000', 'Carne');

    await expect(split.feed().getByText('Carne')).toBeVisible();
    await expect(split.feed()).toContainText('$10.000,00');

    await expect(split.settlements()).toContainText('Bruno → Ana');
    await expect(split.settlements()).toContainText('Vos → Ana');
    await expect(split.settlements()).toContainText(/\$3\.333,3[34]/);
    await expect(split.balances()).toContainText(/\+\$6\.666,6[67]/);

    const toCents = (amount: string) => Number(amount.replace(/\D/g, ''));
    const transfers = (await split.settlements().innerText()).match(/\$[\d.]+,\d{2}/g) ?? [];
    const creditorBalance = (await split.balances().innerText()).match(/\+\$[\d.]+,\d{2}/)?.[0] ?? '';
    expect(transfers).toHaveLength(2);
    expect(transfers.reduce((sum, amount) => sum + toCents(amount), 0)).toBe(toCents(creditorBalance));

    await expect(split.gatheringItem('Cena')).toContainText(/Debés \$3\.333,3[34]/);
    await expect(split.subtitle()).toHaveText(/^Debés \$3\.333,3[34]$/);
  });

  test('un gasto propio suma a "Te deben" en el saldo', async ({ page, freshUser }) => {
    await freshUser('deben');
    const split = new SplitExpensesPage(page);
    await split.goto();
    await split.createGathering('Almuerzo', ['Ana']);

    await split.addExpense('Vos', '4000', 'Pizza');

    await expect(split.gatheringItem('Almuerzo')).toContainText('Te deben $2.000,00');
    await expect(split.subtitle()).toHaveText('Te deben $2.000,00');
  });

  test('cambia el feed al elegir otra juntada de la lista', async ({ page, freshUser }) => {
    await freshUser('cambia');
    const split = new SplitExpensesPage(page);
    await split.goto();
    await split.createGathering('Primera', ['Ana']);
    await expect(page.getByRole('heading', { name: 'Primera' })).toBeVisible();
    await split.createGathering('Segunda', ['Bruno']);
    await expect(page.getByRole('heading', { name: 'Segunda' })).toBeVisible();

    await split.gatheringItem('Primera').click();

    await expect(page.getByRole('heading', { name: 'Primera' })).toBeVisible();
    await expect(split.gatheringItem('Primera')).toHaveAttribute('aria-current', 'true');
  });

  test('pide confirmación antes de eliminar un gasto', async ({ page, freshUser }) => {
    await freshUser('gasto');
    const split = new SplitExpensesPage(page);
    await split.goto();
    await split.createGathering('Parrilla', ['Ana', 'Bruno']);
    await split.addExpense('Ana', '4000', 'Chorizos');
    await expect(page.getByText('Chorizos')).toBeVisible();

    await split.deleteExpenseButton().click();
    await expect(page.getByText('Esta acción no se puede deshacer.')).toBeVisible();
    await page.getByRole('button', { name: 'Cancelar' }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(page.getByText('Chorizos')).toBeVisible();

    await split.deleteExpenseButton().click();
    await page.getByRole('button', { name: 'Eliminar', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
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

  test('si falla el saldo, el header lo dice y el resto de la pantalla sigue', async ({ page, freshUser }) => {
    await freshUser('saldo');
    await page.route('**/api/split-expenses/balance', route =>
      route.fulfill({ status: 500, contentType: 'application/json', body: '{"message":"boom"}' })
    );
    const split = new SplitExpensesPage(page);
    await split.goto();

    await expect(split.subtitle()).toHaveText('No se pudo cargar tu saldo');
    await expect(page.getByText('Todavía no tenés juntadas')).toBeVisible();
  });

  test('marca la juntada como saldada y la reabre', async ({ page, freshUser }) => {
    await freshUser('sal');
    const split = new SplitExpensesPage(page);
    await split.goto();
    await split.createGathering('Cumpleaños', ['Ana', 'Bruno']);

    await split.settleButton().click();

    await expect(split.gatheringList()).toContainText('Saldadas');
    await expect(split.gatheringItem('Cumpleaños')).toContainText('Saldada');
    await expect(split.settlePanel()).toContainText('Todo saldado');
    await expect(split.payerGroup()).toBeHidden();

    await split.reopenButton().click();

    await expect(split.settleButton()).toBeVisible();
    await expect(split.payerGroup()).toBeVisible();
  });

  test('elimina la juntada desde el menú de opciones', async ({ page, freshUser }) => {
    await freshUser('del');
    const split = new SplitExpensesPage(page);
    await split.goto();
    await split.createGathering('Picada', ['Ana', 'Bruno']);
    await expect(page.getByRole('heading', { name: 'Picada' })).toBeVisible();

    await split.optionsButton().click();
    await page.getByRole('menuitem', { name: 'Eliminar juntada' }).click();
    await page.getByRole('button', { name: 'Eliminar', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeHidden();

    await expect(page.getByRole('heading', { name: 'Picada' })).toBeHidden();
    await expect(page.getByText('Todavía no tenés juntadas')).toBeVisible();
  });
});
