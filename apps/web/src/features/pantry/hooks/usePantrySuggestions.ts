import { useDebouncedValue } from '@mantine/hooks';
import useSWR from 'swr';

import { buildQueryString, SWR_KEYS } from '@/shared/api';

import type { PantryProductSuggestion } from '@omni/shared/pantry';

const SUGGEST_DEBOUNCE_MS = 250;

/** Productos de la alacena que coinciden con lo que se escribe (para vincular un ítem de la lista a un producto). */
export function usePantrySuggestions(query: string) {
  const [debounced] = useDebouncedValue(query.trim(), SUGGEST_DEBOUNCE_MS);
  const key = debounced ? `${SWR_KEYS.pantry.productsSuggest}${buildQueryString({ limit: 8, q: debounced })}` : null;
  const { data } = useSWR<PantryProductSuggestion[]>(key, { keepPreviousData: true });

  return { suggestions: key ? (data ?? []) : [] };
}
