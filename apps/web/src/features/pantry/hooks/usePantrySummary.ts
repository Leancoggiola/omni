import useSWR from 'swr';

import { SWR_KEYS } from '@/shared/api';

import type { PantrySummary } from '@omni/shared/pantry';

import { PANTRY_LIST_REFRESH_MS } from '@omni/shared/pantry';

/** Contadores del encabezado (productos, bajo stock, por vencer, en la lista): cambian con lo que hace la pareja. */
export function usePantrySummary() {
  const { data, isLoading, error, mutate } = useSWR<PantrySummary>(SWR_KEYS.pantry.summary, {
    revalidateOnFocus: true,
    refreshInterval: PANTRY_LIST_REFRESH_MS,
  });

  return { summary: data, isLoading, error, mutate };
}
