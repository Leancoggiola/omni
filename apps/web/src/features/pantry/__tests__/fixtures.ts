import type { PantryProduct, PantryShoppingListItem } from '@omni/shared/pantry';

export const product = (overrides: Partial<PantryProduct> = {}): PantryProduct => ({
  id: 'p1',
  createdById: 'u1',
  updatedById: 'u1',
  name: 'Leche entera',
  category: 'DAIRY',
  unit: 'PACKAGES',
  quantity: 1,
  minQuantity: 2,
  expiresAt: null,
  barcode: null,
  isLowStock: true,
  isExpiringSoon: false,
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
  ...overrides,
});

export const listItem = (overrides: Partial<PantryShoppingListItem> = {}): PantryShoppingListItem => ({
  id: 'i1',
  createdById: 'u1',
  updatedById: 'u1',
  name: 'Café molido',
  source: 'MANUAL',
  quantityToBuy: 1,
  unit: 'PACKAGES',
  checked: false,
  pantryProductId: null,
  isLowStock: false,
  isExpiringSoon: false,
  ...overrides,
});
