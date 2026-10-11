import type { Page } from '@playwright/test';

/** Etiquetas de `PROFILE_THEME_OPTIONS` (`@omni/shared/users`). */
export type ThemeOption = 'Claro' | 'Oscuro' | 'Sistema';

export class ProfilePage {
  constructor(private readonly page: Page) {}

  readonly phoneField = () => this.page.getByRole('textbox', { name: 'Teléfono' });
  readonly themeControl = () => this.page.getByRole('radiogroup', { name: 'Tema' });
  readonly themeOption = (option: ThemeOption) => this.themeControl().getByRole('radio', { name: option });
  readonly notificationsSwitch = () => this.page.getByRole('switch', { name: 'Notificaciones' });
  readonly saveButton = () => this.page.getByRole('button', { name: 'Guardar Cambios' });
  readonly savedNotification = () => this.page.getByRole('alert').filter({ hasText: 'Listo' });

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

  /** El radio de Mantine está oculto visualmente: se clickea su etiqueta. */
  async selectTheme(option: ThemeOption) {
    await this.themeControl().getByText(option, { exact: true }).click();
  }

  async save() {
    await this.saveButton().click();
  }

  async changePassword(newPassword: string, confirmation = newPassword) {
    await this.newPasswordField().fill(newPassword);
    await this.confirmPasswordField().fill(confirmation);
    await this.changePasswordButton().click();
  }
}
