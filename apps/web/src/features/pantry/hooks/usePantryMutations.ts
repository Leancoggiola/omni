import { useCallback } from 'react';
import { useSWRConfig } from 'swr';

import { api, SWR_KEYS } from '@/shared/api';

import type { CreatePantryProductPayload, PantryProduct, UpdatePantryProductPayload } from '@omni/shared/pantry';

import { isPantryKey } from '@omni/shared/pantry';

/**
 * Altas, ediciones y bajas de productos. Ninguna escribe en la cache: cada una revalida las keys de la alacena
 * (productos, resumen y lista, que cambia con los productos vinculados) con el filtro, sin vaciar lo que se ve.
 */
export function usePantryMutations() {
  const { mutate } = useSWRConfig();

  const createProduct = useCallback(
    async (payload: CreatePantryProductPayload) => {
      const product = await api.post<PantryProduct>(SWR_KEYS.pantry.products, payload);
      await mutate(isPantryKey).catch(() => undefined);
      return product;
    },
    [mutate]
  );

  const updateProduct = useCallback(
    async (id: string, payload: UpdatePantryProductPayload) => {
      const product = await api.patch<PantryProduct>(SWR_KEYS.pantry.product(id), payload);
      await mutate(isPantryKey).catch(() => undefined);
      return product;
    },
    [mutate]
  );

  const deleteProduct = useCallback(
    async (id: string) => {
      await api.delete(SWR_KEYS.pantry.product(id));
      await mutate((key: unknown) => isPantryKey(key) && key !== SWR_KEYS.pantry.product(id)).catch(() => undefined);
    },
    [mutate]
  );

  return { createProduct, updateProduct, deleteProduct };
}
