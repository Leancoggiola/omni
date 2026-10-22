import type { MediaType, TmdbMediaResult } from './types';

/** Tipo de un resultado de TMDB: el `media_type` de la búsqueda `multi`, o si no viene, película si tiene `title`. */
export function resolveMediaType(item: TmdbMediaResult): MediaType {
  if (item.media_type === 'tv') return 'tv';
  if (item.media_type === 'movie') return 'movie';
  return item.title ? 'movie' : 'tv';
}

/** Clave única de un título de TMDB (`movie-123`): el mismo id puede ser una película y una serie distintas. */
export function buildMediaTmdbKey(mediaType: MediaType, tmdbId: number): string {
  return `${mediaType}-${tmdbId}`;
}

/** `buildMediaTmdbKey` de un resultado de la búsqueda de TMDB. */
export function getTmdbResultKey(item: TmdbMediaResult): string {
  return buildMediaTmdbKey(resolveMediaType(item), item.id);
}

/** Título de un resultado de TMDB: `title` en películas, `name` en series. */
export function getTmdbResultTitle(item: TmdbMediaResult): string {
  return item.title || item.name || 'Sin título';
}
