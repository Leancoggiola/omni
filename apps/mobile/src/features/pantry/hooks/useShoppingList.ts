import { useIsFocused } from '@react-navigation/native';
import useSWR from 'swr';

import { API_KEYS } from '@/shared/api';

import { PANTRY_LIST_REFRESH_MS } from '@omni/shared/pantry';

import type { PantryShoppingListItem } from '@omni/shared/pantry';

/** Lista de compras del hogar (pendientes y comprados juntos), refrescada igual que el inventario. */
export function useShoppingList() {
  const isFocused = useIsFocused();
  const { data, isLoading, error, mutate } = useSWR<PantryShoppingListItem[]>(API_KEYS.pantry.shoppingList, {
    refreshInterval: isFocused ? PANTRY_LIST_REFRESH_MS : 0,
  });

  return { items: data, isLoading, error, mutate };
}
