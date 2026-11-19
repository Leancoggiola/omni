import { useDebouncedValue } from '@mantine/hooks';
import useSWR from 'swr';

import { buildQueryString, SWR_KEYS } from '@/shared/api';

import type { GymCatalogExercise } from '@omni/shared/gym';

import { GYM_CATALOG_MAX_LIMIT } from '@omni/shared/gym';

const SUGGEST_DEBOUNCE_MS = 300;

export const CATALOG_MIN_QUERY_LENGTH = 2;

/**
 * Variantes del catálogo cuyo nombre contiene lo que se escribe. Busca desde 2 letras, con 300 ms de espera, y pide
 * el máximo (20) para que la variante exacta aparezca aunque haya varias con el mismo nombre. `searching` vale
 * mientras se espera o se carga; `error` y `retry` son de la búsqueda y no bloquean el formulario.
 */
export function useGymCatalog(query: string) {
  const trimmed = query.trim();
  const [debounced] = useDebouncedValue(trimmed, SUGGEST_DEBOUNCE_MS);
  const enabled = debounced.length >= CATALOG_MIN_QUERY_LENGTH && trimmed.length >= CATALOG_MIN_QUERY_LENGTH;
  const key = enabled
    ? `${SWR_KEYS.gym.catalog}${buildQueryString({ limit: GYM_CATALOG_MAX_LIMIT, q: debounced })}`
    : null;
  const { data, isLoading, error, mutate } = useSWR<GymCatalogExercise[]>(key);

  return {
    suggestions: key && !error ? (data ?? []) : [],
    queried: trimmed.length >= CATALOG_MIN_QUERY_LENGTH,
    searching: trimmed.length >= CATALOG_MIN_QUERY_LENGTH && (debounced !== trimmed || isLoading),
    error: key ? error : undefined,
    retry: () => mutate(),
    capped: (data?.length ?? 0) >= GYM_CATALOG_MAX_LIMIT,
  };
}
