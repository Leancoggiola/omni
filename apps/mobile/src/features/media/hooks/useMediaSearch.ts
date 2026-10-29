import useSWR from 'swr';

import { API_KEYS, buildQueryString } from '@/shared/api';

import { useDebouncedValue } from './useDebouncedValue';

import type { TmdbSearchResponse } from '@omni/shared/media';

export const MIN_SEARCH_LENGTH = 2;
const SEARCH_DEBOUNCE_MS = 400;

/**
 * Búsqueda en TMDB (películas y series) con debounce; sin query suficiente no pide nada. Necesita al
 * menos `MIN_SEARCH_LENGTH` caracteres, como el `TmdbSearchField` de web.
 */
export function useMediaSearch(query: string) {
  const raw = query.trim();
  const tooShort = raw.length < MIN_SEARCH_LENGTH;
  const debounced = useDebouncedValue(raw, SEARCH_DEBOUNCE_MS);
  const enabled = !tooShort && debounced.length >= MIN_SEARCH_LENGTH;
  const key = enabled
    ? `${API_KEYS.media.search}${buildQueryString({ query: debounced, page: 1, type: 'multi' })}`
    : null;
  const { data, error, isValidating, mutate } = useSWR<TmdbSearchResponse>(key, { keepPreviousData: true });

  return {
    results: enabled ? (data?.results ?? []) : [],
    error: enabled ? error : undefined,
    /** Busca mientras corre el debounce o la request; los resultados anteriores siguen a la vista. */
    isLoading: !tooShort && (raw !== debounced || isValidating),
    /** El texto (sin debounce) no llega al mínimo. */
    tooShort,
    retry: () => void mutate(),
  };
}
