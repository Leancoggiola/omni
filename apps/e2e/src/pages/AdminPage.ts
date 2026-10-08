import type { Page } from '@playwright/test';

export interface NewUserForm {
  username: string;
  name: string;
  email?: string;
  password: string;
  confirmPassword?: string;
}

export class AdminPage {
  constructor(private readonly page: Page) {}

  readonly navItem = () => this.page.getByRole('navigation').getByRole('link', { name: 'Administración' });
  readonly title = () => this.page.getByRole('heading', { name: 'Administración' });
  /** Con el modal abierto la página queda aria-hidden, así que este locator solo resuelve el botón del header. */
  readonly createButton = () => this.page.getByRole('button', { name: 'Crear usuario' }).first();

  readonly modal = () => this.page.getByRole('dialog', { name: 'Crear usuario' });
  readonly usernameField = () => this.modal().getByRole('textbox', { name: 'Usuario' });
  readonly nameField = () => this.modal().getByRole('textbox', { name: 'Nombre' });
  readonly emailField = () => this.modal().getByRole('textbox', { name: 'Email' });
  readonly passwordField = () => this.modal().getByLabel('Contraseña inicial');
  readonly confirmPasswordField = () => this.modal().getByLabel('Confirmar contraseña');
  readonly submitButton = () => this.modal().getByRole('button', { name: 'Crear usuario' });
  readonly cancelButton = () => this.modal().getByRole('button', { name: 'Cancelar' });
  readonly modalError = () => this.modal().getByRole('alert');

  readonly createdNotification = () => this.page.getByRole('alert').filter({ hasText: 'Usuario creado' });
  readonly deletedNotification = () => this.page.getByRole('alert').filter({ hasText: 'Usuario eliminado' });

  readonly rowOf = (username: string) => this.page.getByRole('listitem').filter({ hasText: `@${username}` });
  readonly deleteButtonOf = (username: string) => this.page.getByRole('button', { name: `Eliminar ${username}` });
  readonly confirmDeleteButton = () =>
    this.page.getByRole('dialog').getByRole('button', { name: 'Eliminar usuario', exact: true });

  async goto() {
    await this.page.goto('/admin');
  }

  async openCreateModal() {
    await this.createButton().click();
  }

  async fillForm(user: NewUserForm) {
    await this.usernameField().fill(user.username);
    await this.nameField().fill(user.name);
    if (user.email) await this.emailField().fill(user.email);
    await this.passwordField().fill(user.password);
    await this.confirmPasswordField().fill(user.confirmPassword ?? user.password);
  }

  async createUser(user: NewUserForm) {
    await this.openCreateModal();
    await this.fillForm(user);
    await this.submitButton().click();
  }

  async deleteUser(username: string) {
    await this.deleteButtonOf(username).click();
    await this.confirmDeleteButton().click();
  }
}
