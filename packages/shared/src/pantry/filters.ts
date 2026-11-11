import type { PantryCategory } from './constants';
import type { PantryProduct } from './types';

export type PantryAlertFilter = 'all' | 'low' | 'expiring';

export interface PantryProductFilters {
  query: string;
  category: PantryCategory | 'all';
  alert: PantryAlertFilter;
}

export type PantryProductSuggestion = Pick<PantryProduct, 'id' | 'name' | 'category' | 'unit'>;

export const DEFAULT_PANTRY_FILTERS: PantryProductFilters = { query: '', category: 'all', alert: 'all' };

/** Hay algo que "Limpiar filtros" pueda quitar. */
export function hasActivePantryFilters(filters: PantryProductFilters): boolean {
  return filters.query.trim() !== '' || filters.category !== 'all' || filters.alert !== 'all';
}

/** Búsqueda por nombre (sin mayúsculas), categoría y alerta, todo en el cliente sobre la lista completa. */
export function filterPantryProducts(products: PantryProduct[], filters: PantryProductFilters): PantryProduct[] {
  const query = filters.query.trim().toLowerCase();
  return products.filter(product => {
    if (filters.category !== 'all' && product.category !== filters.category) return false;
    if (filters.alert === 'low' && !product.isLowStock) return false;
    if (filters.alert === 'expiring' && !product.isExpiringSoon) return false;
    return !query || product.name.toLowerCase().includes(query);
  });
}

/** `2026-11-06` → `06/11`; sin fecha, "Sin fecha". */
export function formatExpiryShort(expiresAt: string | null): string {
  if (!expiresAt) return 'Sin fecha';
  const [, month, day] = expiresAt.slice(0, 10).split('-');
  return `${day}/${month}`;
}
