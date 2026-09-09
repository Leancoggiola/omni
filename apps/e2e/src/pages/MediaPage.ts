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
  readonly posterOf = (title: string) => this.page.getByRole('img', { name: title });

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

  /** En la grilla el botón de eliminar solo se renderiza mientras el card está hovereado. */
  async startDelete(title: string) {
    await this.posterOf(title).hover();
    await this.deleteButtonOf(title).click();
  }
}
