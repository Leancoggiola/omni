import useSWR from 'swr';

import { API_KEYS, buildQueryString } from '@/shared/api';
import { useDebouncedValue } from '@/shared/ui';

import { GYM_CATALOG_MAX_LIMIT } from '@omni/shared/gym';

import type { GymCatalogExercise } from '@omni/shared/gym';

const SUGGEST_DEBOUNCE_MS = 300;

export const CATALOG_MIN_QUERY_LENGTH = 2;

/**
 * Variantes del catálogo cuyo nombre contiene lo que se escribe, ordenadas por nombre. Busca desde 2 letras, con 300 ms
 * de espera, y pide el máximo (`GYM_CATALOG_MAX_LIMIT`). `searching` vale mientras se espera o se carga; `error` y
 * `retry` son de la búsqueda y no bloquean el formulario.
 */
export function useGymCatalogSuggestions(query: string) {
  const trimmed = query.trim();
  const debounced = useDebouncedValue(trimmed, SUGGEST_DEBOUNCE_MS);
  const queried = trimmed.length >= CATALOG_MIN_QUERY_LENGTH;
  const key =
    queried && debounced.length >= CATALOG_MIN_QUERY_LENGTH
      ? `${API_KEYS.gym.catalog}${buildQueryString({ limit: GYM_CATALOG_MAX_LIMIT, q: debounced })}`
      : null;
  const { data, isLoading, error, mutate } = useSWR<GymCatalogExercise[]>(key);

  return {
    suggestions: key && !error ? (data ?? []) : [],
    queried,
    searching: queried && (debounced !== trimmed || isLoading),
    error: key ? error : undefined,
    retry: () => mutate(),
  };
}
