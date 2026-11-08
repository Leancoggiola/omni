import { API_PATHS } from '../api/paths';

/**
 * Todas las keys de la alacena (resumen, productos y sus sugerencias, lista de compras): un write las invalida
 * juntas. La usan web y mobile como filtro de `mutate`.
 */
export function isPantryKey(key: unknown): boolean {
  if (typeof key !== 'string') return false;
  const { summary, products, shoppingList } = API_PATHS.pantry;
  return key === summary || key.startsWith(products) || key.startsWith(shoppingList);
}
