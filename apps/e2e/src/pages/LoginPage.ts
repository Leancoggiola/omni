import type { Page } from '@playwright/test';

export class LoginPage {
  constructor(private readonly page: Page) {}

  readonly username = () => this.page.getByLabel('Usuario');
  readonly password = () => this.page.getByLabel('Contraseña');
  readonly submit = () => this.page.getByRole('button', { name: 'Ingresar' });
  readonly error = () => this.page.getByRole('alert');

  async goto() {
    await this.page.goto('/login');
  }

  async login(username: string, password: string) {
    await this.username().fill(username);
    await this.password().fill(password);
    await this.submit().click();
  }
}
