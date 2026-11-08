import { SWR_KEYS } from '@/shared/api';

/** Todas las keys de la alacena (resumen, productos y sus sugerencias, lista de compras): un write las invalida juntas. */
export function isPantryKey(key: unknown): boolean {
  if (typeof key !== 'string') return false;
  const { summary, products, shoppingList } = SWR_KEYS.pantry;
  return key === summary || key.startsWith(products) || key.startsWith(shoppingList);
}
