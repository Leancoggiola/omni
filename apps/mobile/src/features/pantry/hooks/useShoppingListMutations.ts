import { useCallback } from 'react';
import { useSWRConfig } from 'swr';

import { api, API_KEYS } from '@/shared/api';

import type {
  AddShoppingListItemPayload,
  CompleteShoppingListItemPayload,
  PantryProduct,
  PantryShoppingListItem,
} from '@omni/shared/pantry';

import { isPantryKey } from '@omni/shared/pantry';

/**
 * Escrituras de la lista de compras. Comprar suma al stock y generar crea ítems, así que todas revalidan las keys de
 * la alacena juntas (lista, productos y resumen).
 */
export function useShoppingListMutations() {
  const { mutate } = useSWRConfig();

  const generate = useCallback(async () => {
    await api.post<PantryShoppingListItem[]>(API_KEYS.pantry.shoppingListGenerate);
    await mutate(isPantryKey).catch(() => undefined);
  }, [mutate]);

  const addItem = useCallback(
    async (payload: AddShoppingListItemPayload) => {
      const item = await api.post<PantryShoppingListItem>(API_KEYS.pantry.shoppingListItems, payload);
      await mutate(isPantryKey).catch(() => undefined);
      return item;
    },
    [mutate]
  );

  const completeItem = useCallback(
    async (id: string, payload: CompleteShoppingListItemPayload = {}) => {
      const result = await api.patch<{ item: PantryShoppingListItem; product: PantryProduct }>(
        API_KEYS.pantry.shoppingListItemComplete(id),
        payload
      );
      await mutate(isPantryKey).catch(() => undefined);
      return result;
    },
    [mutate]
  );

  const updateItem = useCallback(
    async (id: string, quantityToBuy: number) => {
      await api.patch<PantryShoppingListItem>(API_KEYS.pantry.shoppingListItem(id), { quantityToBuy });
      await mutate(isPantryKey).catch(() => undefined);
    },
    [mutate]
  );

  const uncheckItem = useCallback(
    async (id: string) => {
      await api.patch<PantryShoppingListItem>(API_KEYS.pantry.shoppingListItemUncheck(id), {});
      await mutate(isPantryKey).catch(() => undefined);
    },
    [mutate]
  );

  const removeItem = useCallback(
    async (id: string) => {
      await api.delete(API_KEYS.pantry.shoppingListItem(id));
      await mutate(isPantryKey).catch(() => undefined);
    },
    [mutate]
  );

  const clearChecked = useCallback(async () => {
    await api.delete(API_KEYS.pantry.shoppingListChecked);
    await mutate(isPantryKey).catch(() => undefined);
  }, [mutate]);

  return { generate, addItem, completeItem, updateItem, uncheckItem, removeItem, clearChecked };
}
