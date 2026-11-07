import type { Page } from '@playwright/test';

export class PantryPage {
  constructor(private readonly page: Page) {}

  readonly addProductButton = () => this.page.getByRole('button', { name: 'Agregar producto' }).first();
  readonly dialog = () => this.page.getByRole('dialog');
  readonly nameField = () => this.dialog().getByRole('textbox', { name: /Nombre/ });
  readonly categoryField = () => this.dialog().getByRole('combobox', { name: /Categoría/ });
  readonly quantityField = () => this.dialog().getByRole('textbox', { name: /Cantidad/ });
  readonly minimumField = () => this.dialog().getByRole('textbox', { name: 'Mínimo' });
  readonly submitProductButton = () => this.dialog().getByRole('button', { name: 'Agregar producto' });
  readonly saveChangesButton = () => this.dialog().getByRole('button', { name: 'Guardar cambios' });
  readonly addOneButton = () => this.dialog().getByRole('button', { name: 'Sumar uno' });
  readonly searchField = () => this.page.getByRole('textbox', { name: 'Buscar en tu alacena' });
  readonly rowOf = (name: string) => this.page.getByRole('row').filter({ hasText: name });
  readonly editButtonOf = (name: string) => this.page.getByRole('button', { name: `Ver y editar ${name}` });
  readonly deleteButtonOf = (name: string) => this.page.getByRole('button', { name: `Eliminar ${name}` });
  readonly shoppingTab = () =>
    this.page.getByRole('radiogroup', { name: 'Alacena' }).locator('label', { hasText: 'Lista de compras' });
  readonly generateButton = () => this.page.getByRole('button', { name: 'Generar desde bajo stock' }).first();
  readonly confirmGenerateButton = () => this.dialog().getByRole('button', { name: 'Generar lista' });
  readonly checkboxOf = (name: string) => this.page.getByRole('checkbox', { name: `Marcar ${name} como comprado` });
  readonly uncheckOf = (name: string) => this.page.getByRole('checkbox', { name: `Destildar ${name}` });
  readonly retryButton = () => this.page.getByRole('button', { name: 'Reintentar' });

  async goto() {
    await this.page.goto('/pantry');
  }

  async createViaApi(data: Record<string, unknown>) {
    const res = await this.page.request.post('/api/pantry/products', { data });
    if (!res.ok()) throw new Error(`No se pudo precargar el producto: ${await res.text()}`);
  }

  async addProduct(name: string, categoryLabel: string, quantity: string, minimum?: string) {
    await this.addProductButton().click();
    await this.nameField().fill(name);
    await this.categoryField().click();
    await this.page.getByRole('option', { name: categoryLabel, exact: true }).click();
    await this.quantityField().fill(quantity);
    if (minimum) await this.minimumField().fill(minimum);
    await this.submitProductButton().click();
  }
}
