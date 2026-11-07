import useSWR from 'swr';

import { buildQueryString, SWR_KEYS } from '@/shared/api';

import type { PaginatedResponse } from '@omni/shared/common';
import type { PantryProduct } from '@omni/shared/pantry';

import { PANTRY_LIST_REFRESH_MS } from '@omni/shared/pantry';

const PRODUCTS_PAGE_LIMIT = 100;

/**
 * Inventario del hogar: una sola key con la página más grande que admite la API y filtros en el cliente. Es compartido
 * con la pareja, así que revalida al enfocar la pestaña y se refresca cada `PANTRY_LIST_REFRESH_MS` mientras está visible.
 */
export function usePantryProducts() {
  const key = `${SWR_KEYS.pantry.products}${buildQueryString({ limit: PRODUCTS_PAGE_LIMIT })}`;
  const { data, isLoading, error, mutate } = useSWR<PaginatedResponse<PantryProduct>>(key, {
    revalidateOnFocus: true,
    refreshInterval: PANTRY_LIST_REFRESH_MS,
  });

  return { products: data?.items, total: data?.total, isLoading, error, mutate };
}
