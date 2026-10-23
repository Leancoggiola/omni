import type { MediaType, MediaStatus } from './types';

export const MEDIA_TYPES = ['movie', 'tv'] as const satisfies readonly MediaType[];
export const MEDIA_STATUSES = ['to_watch', 'watching', 'watched'] as const satisfies readonly MediaStatus[];
export const SEARCH_TYPES = ['movie', 'tv', 'multi'] as const;

/** Display labels (Spanish) */
export const MEDIA_TYPE_LABELS: Record<MediaType, string> = {
  movie: 'Película',
  tv: 'Serie',
};

export const MEDIA_STATUS_LABELS: Record<MediaStatus, string> = {
  to_watch: 'Pendiente',
  watching: 'Viendo',
  watched: 'Vista',
};

export const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';
export const TMDB_POSTER_W500 = `${TMDB_IMAGE_BASE}/w500`;
/** Miniaturas de listas (póster de ~56 dp en mobile): w500 baja ~10 veces más bytes de los que se ven. */
export const TMDB_POSTER_W185 = `${TMDB_IMAGE_BASE}/w185`;
