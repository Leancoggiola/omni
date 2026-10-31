import type { PantryCategory, PantryShoppingSource, PantryUnit } from './constants';

export interface PantryProduct {
  id: string;
  createdById: string | null;
  name: string;
  category: PantryCategory;
  unit: PantryUnit;
  quantity: number;
  minQuantity: number | null;
  expiresAt: string | null;
  isLowStock: boolean;
  isExpiringSoon: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PantrySummary {
  totalProducts: number;
  expiringSoonCount: number;
  lowStockCount: number;
  shoppingListCount: number;
}

export interface PantryShoppingListItem {
  id: string;
  createdById: string | null;
  name: string;
  source: PantryShoppingSource;
  quantityToBuy: number;
  unit: PantryUnit;
  checked: boolean;
  pantryProductId: string | null;
  isLowStock: boolean;
  isExpiringSoon: boolean;
  linkedProduct?: Pick<PantryProduct, 'id' | 'name' | 'quantity' | 'unit'>;
}
