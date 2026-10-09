import type { MediaItem, MediaStatus, MediaType } from '@omni/shared/media';

export type MediaListFilters = {
  status: MediaStatus | 'all';
  mediaType: MediaType | 'all';
  /** Búsqueda por título dentro de la lista (no en TMDB). */
  query: string;
};

export const DEFAULT_MEDIA_FILTERS: MediaListFilters = { status: 'all', mediaType: 'all', query: '' };

/** Filtros de la lista en el cliente, como web (`useMyMediaList` + `MyMediaList`). */
export function filterMediaItems(items: readonly MediaItem[], filters: MediaListFilters): MediaItem[] {
  const q = filters.query.trim().toLowerCase();
  return items.filter(
    item =>
      (filters.status === 'all' || item.status === filters.status) &&
      (filters.mediaType === 'all' || item.mediaType === filters.mediaType) &&
      (!q || item.title.toLowerCase().includes(q))
  );
}

/** ¿Hay algún filtro activo? Distingue "lista vacía" de "sin resultados". */
export function hasActiveFilters(filters: MediaListFilters): boolean {
  return filters.status !== 'all' || filters.mediaType !== 'all' || filters.query.trim() !== '';
}
