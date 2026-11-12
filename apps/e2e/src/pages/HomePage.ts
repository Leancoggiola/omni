import type { Page } from '@playwright/test';

export class HomePage {
  constructor(private readonly page: Page) {}

  /** Card de efemérides */
  readonly holidaysTitle = () => this.page.getByRole('heading', { name: 'Efemérides de hoy' });
  readonly holiday = (text: string) => this.page.getByText(text, { exact: true });
  readonly holidaysSourceLink = () => this.page.getByRole('link', { name: 'Ver efemérides de hoy en Wikipedia' });
  readonly holidaysError = () =>
    this.page.getByRole('alert').filter({ hasText: 'No se pudieron cargar las efemérides de hoy' });

  /** Card de clima */
  readonly weather = () => this.page.getByRole('region', { name: 'Clima' });
  readonly weatherError = () => this.page.getByRole('alert').filter({ hasText: 'No se pudo cargar el clima' });
  readonly weatherNoLocation = () => this.page.getByText('Activá la ubicación para ver el clima');
  readonly allowLocationButton = () => this.page.getByRole('button', { name: 'Permitir ubicación' });

  /** Layout: en desktop solo se ve el toggle del navbar (el header es mobile-only). */
  readonly themeToggle = () => this.page.getByRole('button', { name: /^Cambiar a tema (claro|oscuro)$/ });
  readonly logoutButton = () => this.page.getByRole('button', { name: 'Cerrar sesión' });
  readonly navItem = (label: string) =>
    this.page.getByRole('navigation').getByRole('link', { name: label, exact: true });
  /** Mantine refleja el esquema aplicado en `data-mantine-color-scheme` del `<html>`. */
  readonly documentRoot = () => this.page.locator('html');

  async goto() {
    await this.page.goto('/');
  }

  /** Bloque de título + ítem actual; el link a Wikipedia queda fuera, como hermano. */
  readonly nextHolidayButton = () => this.page.getByRole('button', { name: 'Siguiente efeméride' });

  async nextHoliday() {
    await this.nextHolidayButton().click();
  }

  async toggleTheme() {
    await this.themeToggle().click();
  }

  /** Navega del lado del cliente, sin recargar la página (a diferencia de `page.goto`). */
  async navigateTo(label: string) {
    await this.navItem(label).click();
  }

  readonly logoutDialog = () => this.page.getByRole('dialog');
  readonly cancelLogoutButton = () => this.page.getByRole('dialog').getByRole('button', { name: 'Cancelar' });
  readonly confirmLogoutButton = () => this.page.getByRole('dialog').getByRole('button', { name: 'Cerrar sesión' });

  /** Cierra sesión confirmando el diálogo "¿Cerrar sesión?". */
  async logout() {
    await this.logoutButton().click();
    await this.confirmLogoutButton().click();
  }
}
