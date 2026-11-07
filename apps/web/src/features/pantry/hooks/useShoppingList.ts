import useSWR from 'swr';

import { SWR_KEYS } from '@/shared/api';

import type { PantryShoppingListItem } from '@omni/shared/pantry';

import { PANTRY_LIST_REFRESH_MS } from '@omni/shared/pantry';

/** Lista de compras del hogar (pendientes y comprados juntos), refrescada igual que el inventario. */
export function useShoppingList() {
  const { data, isLoading, error, mutate } = useSWR<PantryShoppingListItem[]>(SWR_KEYS.pantry.shoppingList, {
    revalidateOnFocus: true,
    refreshInterval: PANTRY_LIST_REFRESH_MS,
  });

  return { items: data, isLoading, error, mutate };
}
