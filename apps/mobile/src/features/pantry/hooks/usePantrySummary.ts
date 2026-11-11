import { useIsFocused } from '@react-navigation/native';
import useSWR from 'swr';

import { API_KEYS } from '@/shared/api';

import { PANTRY_LIST_REFRESH_MS } from '@omni/shared/pantry';

import type { PantrySummary } from '@omni/shared/pantry';

/** Contadores del encabezado (productos, bajo stock, por vencer, en la lista): cambian con lo que hace la pareja. */
export function usePantrySummary() {
  const isFocused = useIsFocused();
  const { data, isLoading, error, mutate } = useSWR<PantrySummary>(API_KEYS.pantry.summary, {
    refreshInterval: isFocused ? PANTRY_LIST_REFRESH_MS : 0,
  });

  return { summary: data, isLoading, error, mutate };
}
