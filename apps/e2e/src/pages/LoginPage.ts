import type { Page } from '@playwright/test';

export class LoginPage {
  constructor(private readonly page: Page) {}

  readonly username = () => this.page.getByLabel('Usuario');
  readonly password = () => this.page.getByLabel('Contraseña');
  readonly submit = () => this.page.getByRole('button', { name: 'Ingresar' });
  readonly card = () => this.page.getByRole('region', { name: 'Ingreso' });
  readonly error = () => this.page.getByRole('alert');

  /** Ancho del documento vs. el del viewport: si el primero es mayor hay scroll horizontal. */
  async pageWidths() {
    return (await this.page.evaluate(
      '({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth })'
    )) as { scrollWidth: number; clientWidth: number };
  }

  async goto() {
    await this.page.goto('/login');
  }

  async login(username: string, password: string) {
    await this.username().fill(username);
    await this.password().fill(password);
    await this.submit().click();
  }
}
