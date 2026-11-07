import type { Page } from '@playwright/test';

export class SplitExpensesPage {
  constructor(private readonly page: Page) {}

  readonly friendsButton = () => this.page.getByRole('button', { name: 'Amigos', exact: true });
  /**
   * Sin juntadas, el estado vacío suma su propio "Nueva juntada" (abre el mismo modal): se usa el de la cabecera,
   * que siempre está, para no depender de si el usuario del worker ya tiene juntadas.
   */
  readonly newGatheringButton = () => this.page.getByRole('button', { name: 'Nueva juntada' }).first();
  readonly subtitle = () => this.page.getByRole('heading', { level: 1 }).locator('xpath=following-sibling::*[1]');

  readonly friendNameField = () => this.page.getByPlaceholder('Nombre', { exact: true });
  readonly friendAliasField = () => this.page.getByPlaceholder('Alias', { exact: true });
  readonly saveFriendButton = () => this.page.getByRole('button', { name: 'Agregar', exact: true });

  readonly newGatheringDialog = () => this.page.getByRole('dialog');
  readonly gatheringNameField = () => this.newGatheringDialog().getByRole('textbox', { name: 'Nombre' }).first();
  readonly newParticipantButton = () => this.newGatheringDialog().getByRole('button', { name: 'Amigo nuevo' });
  readonly participantField = () => this.newGatheringDialog().getByRole('textbox', { name: 'Nombre del participante' });
  readonly addParticipantButton = () => this.newGatheringDialog().getByRole('button', { name: 'Agregar participante' });
  /** El checkbox del chip está oculto visualmente: se marca clickeando su etiqueta y se verifica con `friendCheckbox`. */
  readonly friendChip = (name: string) => this.newGatheringDialog().getByText(name, { exact: true });
  readonly friendCheckbox = (name: string) => this.newGatheringDialog().getByRole('checkbox', { name, exact: true });
  readonly createGatheringButton = () => this.newGatheringDialog().getByRole('button', { name: 'Crear juntada' });

  readonly gatheringList = () => this.page.getByRole('region', { name: 'Juntadas' });
  readonly gatheringItem = (name: string) => this.gatheringList().getByRole('button', { name });
  readonly feed = () => this.page.getByRole('region', { name: 'Feed de la juntada' });
  readonly settlePanel = () => this.page.getByRole('region', { name: 'Saldar cuentas' });

  readonly optionsButton = () => this.page.getByRole('button', { name: 'Opciones de la juntada' });
  readonly payerGroup = () => this.page.getByRole('radiogroup', { name: 'Quién pagó' });
  readonly amountField = () => this.page.getByRole('textbox', { name: 'Monto' });
  readonly descriptionField = () => this.page.getByRole('textbox', { name: 'Descripción' });
  readonly addExpenseButton = () => this.page.getByRole('button', { name: 'Agregar gasto' });
  readonly deleteExpenseButton = () => this.page.getByRole('button', { name: 'Eliminar gasto' });
  readonly retryButton = () => this.page.getByRole('button', { name: 'Reintentar' });
  readonly settlements = () => this.page.getByRole('group', { name: '¿Quién le debe a quién?' });
  readonly balances = () => this.page.getByRole('group', { name: 'Saldo de cada participante' });
  readonly settleButton = () => this.page.getByRole('button', { name: 'Marcar como saldada' });
  readonly reopenButton = () => this.page.getByRole('button', { name: 'Reabrir' });

  async goto() {
    await this.page.goto('/split-expenses');
  }

  async openFriends() {
    await this.friendsButton().click();
  }

  async submitFriend(name: string, alias: string) {
    await this.friendNameField().fill(name);
    await this.friendAliasField().fill(alias);
    await this.saveFriendButton().click();
  }

  /** Abre "Nueva juntada" y completa el nombre; la persona propia ("Vos") ya viene incluida. */
  async openNewGathering(name: string) {
    await this.newGatheringButton().click();
    await this.gatheringNameField().fill(name);
  }

  async createGathering(name: string, participants: string[]) {
    await this.openNewGathering(name);

    for (const participant of participants) {
      await this.newParticipantButton().click();
      await this.participantField().fill(participant);
      await this.addParticipantButton().click();
    }

    await this.createGatheringButton().click();
  }

  async addExpense(payer: string, amount: string, description?: string) {
    await this.payerGroup().getByText(payer, { exact: true }).click();
    await this.amountField().fill(amount);
    if (description) await this.descriptionField().fill(description);
    await this.addExpenseButton().click();
  }
}
