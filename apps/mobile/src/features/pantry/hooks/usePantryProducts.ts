import { useIsFocused } from '@react-navigation/native';
import useSWR from 'swr';

import { API_KEYS, buildQueryString, fetcher } from '@/shared/api';

import { PANTRY_LIST_REFRESH_MS } from '@omni/shared/pantry';

import type { PaginatedResponse } from '@omni/shared/common';
import type { PantryProduct } from '@omni/shared/pantry';

const PRODUCTS_PAGE_LIMIT = 100;

/** Trae todas las páginas del inventario (la API pagina de a 100) y las junta en una sola lista. */
async function fetchAllProducts(firstPageKey: string): Promise<PaginatedResponse<PantryProduct>> {
  const first = await fetcher<PaginatedResponse<PantryProduct>>(firstPageKey);
  const items = [...first.items];
  for (let page = 2; items.length < first.total && page <= Math.ceil(first.total / PRODUCTS_PAGE_LIMIT); page += 1) {
    const next = await fetcher<PaginatedResponse<PantryProduct>>(
      `${API_KEYS.pantry.products}${buildQueryString({ limit: PRODUCTS_PAGE_LIMIT, page })}`
    );
    items.push(...next.items);
  }
  return { ...first, items };
}

/**
 * Inventario completo del hogar en una sola key (`?limit=100`, todas las páginas) y filtros en el cliente. Es
 * compartido con la pareja: revalida al volver a primer plano y se refresca cada `PANTRY_LIST_REFRESH_MS` solo con
 * la pantalla enfocada.
 */
export function usePantryProducts() {
  const isFocused = useIsFocused();
  const key = `${API_KEYS.pantry.products}${buildQueryString({ limit: PRODUCTS_PAGE_LIMIT })}`;
  const { data, isLoading, error, mutate } = useSWR<PaginatedResponse<PantryProduct>>(key, fetchAllProducts, {
    refreshInterval: isFocused ? PANTRY_LIST_REFRESH_MS : 0,
  });

  return { products: data?.items, total: data?.total, isLoading, error, mutate };
}
