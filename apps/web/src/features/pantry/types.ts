import type { PantryCategory, PantryProduct } from '@omni/shared/pantry';

export type PantryTab = 'inventory' | 'shopping';

export type PantryAlertFilter = 'all' | 'low' | 'expiring';

export interface PantryProductFilters {
  query: string;
  category: PantryCategory | 'all';
  alert: PantryAlertFilter;
}

export type PantryProductSuggestion = Pick<PantryProduct, 'id' | 'name' | 'category' | 'unit'>;
