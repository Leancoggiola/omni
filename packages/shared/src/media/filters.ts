import { MEDIA_STATUS_LABELS, MEDIA_STATUSES, MEDIA_TYPE_LABELS, MEDIA_TYPES } from './constants';

import type { MediaItem, MediaStatus, MediaType } from './types';

export const MEDIA_STATUS_OPTIONS = MEDIA_STATUSES.map(value => ({ value, label: MEDIA_STATUS_LABELS[value] }));

export const MEDIA_TYPE_OPTIONS = MEDIA_TYPES.map(value => ({ value, label: MEDIA_TYPE_LABELS[value] }));

export type MediaListFilters = {
  status: MediaStatus | 'all';
  mediaType: MediaType | 'all';
  query: string;
};

export const DEFAULT_MEDIA_FILTERS: MediaListFilters = { status: 'all', mediaType: 'all', query: '' };

/** Filtra la lista del usuario en el cliente por estado, tipo y título (`query`, sin distinguir mayúsculas). */
export function filterMediaItems(items: readonly MediaItem[], filters: MediaListFilters): MediaItem[] {
  const q = filters.query.trim().toLowerCase();
  return items.filter(
    item =>
      (filters.status === 'all' || item.status === filters.status) &&
      (filters.mediaType === 'all' || item.mediaType === filters.mediaType) &&
      (!q || item.title.toLowerCase().includes(q))
  );
}

/** ¿Hay algún filtro activo? Distingue "lista vacía" de "sin resultados"; una búsqueda solo con espacios no cuenta. */
export function hasActiveFilters(filters: MediaListFilters): boolean {
  return filters.status !== 'all' || filters.mediaType !== 'all' || filters.query.trim() !== '';
}
