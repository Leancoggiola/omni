import type { Page } from '@playwright/test';

export type MediaStatus = 'Pendiente' | 'Viendo' | 'Vista';

export class MediaPage {
  constructor(private readonly page: Page) {}

  readonly addButton = () => this.page.getByRole('button', { name: 'Agregar' }).first();
  readonly searchField = () => this.page.getByRole('textbox', { name: 'Título' });
  readonly statusField = () => this.page.getByRole('combobox', { name: 'Estado', exact: true });
  readonly saveButton = () => this.page.getByRole('button', { name: 'Guardar' });
  readonly statusOf = (title: string) => this.page.getByRole('combobox', { name: `Estado de ${title}` });
  readonly deleteButtonOf = (title: string) => this.page.getByRole('button', { name: `Eliminar ${title}` });
  readonly viewToggle = () => this.page.getByRole('radiogroup', { name: 'Vista' });
  readonly typeFilter = () => this.page.getByRole('combobox', { name: 'Tipo de contenido' });
  readonly retryButton = () => this.page.getByRole('button', { name: 'Reintentar' });
  readonly searchErrorText = () => this.page.getByText('No se pudo buscar en TMDB');
  readonly searchEmptyText = () => this.page.getByText('No se encontraron resultados');
  readonly noResultsText = () => this.page.getByText('No hay resultados');
  readonly emptyListText = () => this.page.getByText('Tu lista está vacía');
  readonly posterOf = (title: string) => this.page.getByRole('button', { name: title, exact: true });

  async goto() {
    await this.page.goto('/media');
  }

  /** Alta por API: las precondiciones no necesitan pasar por el modal. */
  async addViaApi(tmdbId: number, mediaType: 'movie' | 'tv', status = 'to_watch') {
    const res = await this.page.request.post('/api/media/list', { data: { tmdbId, mediaType, status } });
    if (!res.ok()) throw new Error(`No se pudo precargar el media ${tmdbId}: ${await res.text()}`);
    await this.page.reload();
  }

  async addFromSearch(query: string, status?: MediaStatus) {
    await this.addButton().click();
    await this.searchField().fill(query);
    await this.page.getByRole('option', { name: new RegExp(query, 'i') }).click();

    if (status) {
      await this.statusField().click();
      await this.page.getByRole('option', { name: status, exact: true }).click();
    }

    await this.saveButton().click();
  }

  async changeStatus(title: string, status: MediaStatus) {
    await this.statusOf(title).click();
    await this.page.getByRole('option', { name: status, exact: true }).click();
  }

  async filterByType(label: string) {
    await this.typeFilter().click();
    await this.page.getByRole('option', { name: label, exact: true }).click();
  }

  /** El botón de eliminar está siempre visible, también en la grilla. */
  async startDelete(title: string) {
    await this.deleteButtonOf(title).click();
  }
}
