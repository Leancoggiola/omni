import { useCallback } from 'react';
import { useSWRConfig } from 'swr';

import { api, API_KEYS } from '@/shared/api';

import { isPantryKey } from '@omni/shared/pantry';

import type {
  AdjustPantryStockPayload,
  PantryBarcodeLookup,
  PantryProduct,
  PantryScanResult,
  ScanPantryProductPayload,
  UpdatePantryProductPayload,
} from '@omni/shared/pantry';

/**
 * Código de barras de la alacena: `lookup` resuelve un código (alacena, caché u Open Food Facts) sin escribir nada,
 * `scan` registra el escaneo (suma, vincula o da de alta) y `undoScan` lo deshace según su `outcome`: un alta se borra
 * (restar dejaría el producto en cero con el código), una suma se resta con `/stock` y una vinculación además suelta el
 * código. Si la resta sale y falla soltar el código, `undoScan` no tira: devuelve `codeKept: true` para avisar que el
 * stock ya bajó y el código sigue vinculado. Las escrituras revalidan las keys de la alacena con el filtro, sin vaciar
 * lo que se ve.
 */
export function usePantryBarcode() {
  const { mutate } = useSWRConfig();

  const revalidate = useCallback(
    (skip?: string) => mutate((key: unknown) => isPantryKey(key) && key !== skip).catch(() => undefined),
    [mutate]
  );

  const lookup = useCallback((barcode: string) => api.get<PantryBarcodeLookup>(API_KEYS.pantry.barcode(barcode)), []);

  const scan = useCallback(
    async (payload: ScanPantryProductPayload) => {
      const result = await api.post<PantryScanResult>(API_KEYS.pantry.productsScan, payload);
      await revalidate();
      return result;
    },
    [revalidate]
  );

  const undoScan = useCallback(
    async ({ outcome, product }: PantryScanResult, quantity: number): Promise<{ codeKept: boolean }> => {
      if (outcome === 'CREATED') {
        await api.delete(API_KEYS.pantry.product(product.id));
        await revalidate(API_KEYS.pantry.product(product.id));
        return { codeKept: false };
      }
      const adjust: AdjustPantryStockPayload = { delta: -quantity };
      await api.post<PantryProduct>(API_KEYS.pantry.productStock(product.id), adjust);
      let codeKept = false;
      if (outcome === 'LINKED') {
        const unlink: UpdatePantryProductPayload = { barcode: null };
        codeKept = await api.patch<PantryProduct>(API_KEYS.pantry.product(product.id), unlink).then(
          () => false,
          () => true
        );
      }
      await revalidate();
      return { codeKept };
    },
    [revalidate]
  );

  return { lookup, scan, undoScan };
}
