import type { Page } from '@playwright/test';

export class HomePage {
  constructor(private readonly page: Page) {}

  // Card de efemérides
  readonly holidaysTitle = () => this.page.getByRole('heading', { name: 'Efemérides de hoy' });
  readonly holiday = (text: string) => this.page.getByText(text, { exact: true });
  readonly holidaysSourceLink = () => this.page.getByRole('link', { name: 'Ver efemérides de hoy en Wikipedia' });
  readonly holidaysError = () =>
    this.page.getByRole('alert').filter({ hasText: 'No se pudieron cargar las efemérides de hoy' });

  // Layout: en desktop solo se ve el toggle del navbar (el header es mobile-only).
  readonly themeToggle = () => this.page.getByRole('button', { name: /^Cambiar a tema (claro|oscuro)$/ });
  readonly logoutButton = () => this.page.getByRole('button', { name: 'Cerrar sesión' });
  /** Mantine refleja el esquema aplicado en `data-mantine-color-scheme` del `<html>`. */
  readonly documentRoot = () => this.page.locator('html');

  async goto() {
    await this.page.goto('/');
  }

  /** Toda la card es clickeable; se clickea el título porque el link frena la propagación. */
  async nextHoliday() {
    await this.holidaysTitle().click();
  }

  async toggleTheme() {
    await this.themeToggle().click();
  }

  async logout() {
    await this.logoutButton().click();
  }
}
