import type { PantryProduct, PantryShoppingListItem } from '@omni/shared/pantry';

import { computeQuantityToBuy } from '@omni/shared/pantry';

export interface GeneratePreviewRow {
  product: PantryProduct;
  quantityToBuy: number;
  alreadyListed: boolean;
}

/** Pendientes primero y comprados aparte, cada grupo en el orden de la API. */
export function splitShoppingList(items: PantryShoppingListItem[]) {
  return {
    pending: items.filter(item => !item.checked),
    done: items.filter(item => item.checked),
  };
}

/**
 * Lo que va a hacer "Generar desde bajo stock": un renglón por producto en su mínimo o por debajo, con la cantidad
 * que calcula la API y si ya tiene un ítem automático sin tildar (en ese caso solo se actualiza la cantidad).
 */
export function buildGeneratePreview(products: PantryProduct[], items: PantryShoppingListItem[]): GeneratePreviewRow[] {
  const listed = new Set(
    items.filter(item => !item.checked && item.source === 'AUTO' && item.pantryProductId).map(i => i.pantryProductId)
  );
  return products
    .filter(product => product.isLowStock && product.minQuantity !== null)
    .map(product => ({
      product,
      quantityToBuy: computeQuantityToBuy(product.quantity, product.minQuantity ?? 0),
      alreadyListed: listed.has(product.id),
    }));
}
