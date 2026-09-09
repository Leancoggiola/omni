import type { Page } from '@playwright/test';

export class ProfilePage {
  constructor(private readonly page: Page) {}

  readonly phoneField = () => this.page.getByRole('textbox', { name: 'Teléfono' });
  readonly themeSelect = () => this.page.getByRole('combobox', { name: 'Tema' });
  readonly notificationsSwitch = () => this.page.getByRole('switch', { name: 'Notificaciones' });
  readonly saveButton = () => this.page.getByRole('button', { name: 'Guardar Cambios' });

  readonly newPasswordField = () => this.page.getByLabel('Nueva contraseña');
  readonly confirmPasswordField = () => this.page.getByLabel('Confirmar contraseña');
  readonly changePasswordButton = () => this.page.getByRole('button', { name: 'Cambiar contraseña' });

  async goto() {
    await this.page.goto('/profile');
  }

  /** El input del Switch de Mantine está oculto visualmente, así que no pasa el check de actionability. */
  async toggleNotifications() {
    await this.notificationsSwitch().click({ force: true });
  }

  async changePassword(newPassword: string, confirmation = newPassword) {
    await this.newPasswordField().fill(newPassword);
    await this.confirmPasswordField().fill(confirmation);
    await this.changePasswordButton().click();
  }
}
