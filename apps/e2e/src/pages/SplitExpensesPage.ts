import type { Page } from '@playwright/test';

export class SplitExpensesPage {
  constructor(private readonly page: Page) {}

  readonly friendsButton = () => this.page.getByRole('button', { name: 'Amigos' });
  readonly newGatheringButton = () => this.page.getByRole('button', { name: 'Nueva juntada' });

  readonly friendNameField = () => this.page.getByPlaceholder('Nombre', { exact: true });
  readonly friendAliasField = () => this.page.getByPlaceholder('Alias', { exact: true });
  readonly saveFriendButton = () => this.page.getByRole('button', { name: 'Guardar amigo' });

  readonly gatheringNameField = () => this.page.getByRole('textbox', { name: 'Nombre de la juntada' });
  readonly participantField = () => this.page.getByPlaceholder('Nombre o alias');
  readonly addParticipantButton = () => this.page.getByRole('button', { name: 'Agregar participante' });
  readonly createGatheringButton = () => this.page.getByRole('button', { name: 'Crear' });

  readonly expandButton = () => this.page.getByRole('button', { name: 'Expandir' });
  readonly optionsButton = () => this.page.getByRole('button', { name: 'Opciones de la juntada' });
  readonly participantSelect = () => this.page.getByRole('combobox', { name: 'Participante' });
  readonly amountField = () => this.page.getByRole('textbox', { name: 'Monto' });
  readonly descriptionField = () => this.page.getByRole('textbox', { name: 'Descripción' });
  readonly addExpenseButton = () => this.page.getByRole('button', { name: 'Agregar gasto' });
  readonly settleButton = () => this.page.getByRole('button', { name: 'Marcar como saldado' });

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

  async createGathering(name: string, participants: string[]) {
    await this.newGatheringButton().click();
    await this.gatheringNameField().fill(name);

    for (const participant of participants) {
      await this.participantField().fill(participant);
      await this.addParticipantButton().click();
    }

    await this.createGatheringButton().click();
  }

  async addExpense(participant: string, amount: string, description?: string) {
    await this.participantSelect().click();
    await this.page.getByRole('option', { name: participant, exact: true }).click();
    await this.amountField().fill(amount);
    if (description) await this.descriptionField().fill(description);
    await this.addExpenseButton().click();
  }

  /** Una juntada recién creada ya viene expandida, pero al recargar la página arranca contraída. */
  async ensureExpanded(name: string) {
    await this.page.getByText(name).waitFor();
    if (await this.expandButton().isVisible()) await this.expandButton().click();
  }
}
