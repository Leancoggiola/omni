import { describe, expect, it } from 'vitest';
import { API_PATHS } from '../../api/paths';
import {
  buildGeneratePreview,
  DEFAULT_PANTRY_FILTERS,
  filterPantryProducts,
  formatExpiryShort,
  hasActivePantryFilters,
  INITIAL_PRODUCT_FORM_VALUES,
  isPantryKey,
  productFormSchema,
  splitShoppingList,
  toProductFormValues,
  toProductPayload,
} from '..';
import type { PantryProduct, PantryShoppingListItem } from '..';

const product = (overrides: Partial<PantryProduct> = {}): PantryProduct => ({
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

const listItem = (overrides: Partial<PantryShoppingListItem> = {}): PantryShoppingListItem => ({
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

const milk = product();
const apples = product({ id: 'p2', name: 'Manzanas', category: 'FRUIT', isLowStock: false, isExpiringSoon: true });

describe('filterPantryProducts', () => {
  it('filtra por nombre sin distinguir mayúsculas, por categoría y por alerta', () => {
    expect(filterPantryProducts([milk, apples], { ...DEFAULT_PANTRY_FILTERS, query: ' MANZ ' })).toEqual([apples]);
    expect(filterPantryProducts([milk, apples], { ...DEFAULT_PANTRY_FILTERS, category: 'DAIRY' })).toEqual([milk]);
    expect(filterPantryProducts([milk, apples], { ...DEFAULT_PANTRY_FILTERS, alert: 'low' })).toEqual([milk]);
    expect(filterPantryProducts([milk, apples], { ...DEFAULT_PANTRY_FILTERS, alert: 'expiring' })).toEqual([apples]);
  });

  it('detecta filtros activos', () => {
    expect(hasActivePantryFilters(DEFAULT_PANTRY_FILTERS)).toBe(false);
    expect(hasActivePantryFilters({ ...DEFAULT_PANTRY_FILTERS, query: 'a' })).toBe(true);
  });

  it('formatea el vencimiento corto', () => {
    expect(formatExpiryShort('2026-11-06')).toBe('06/11');
    expect(formatExpiryShort(null)).toBe('Sin fecha');
  });
});

describe('shoppingList', () => {
  it('separa pendientes y comprados', () => {
    const done = listItem({ id: 'i2', checked: true });
    expect(splitShoppingList([listItem(), done])).toEqual({ pending: [listItem()], done: [done] });
  });

  it('arma la vista previa de generar con la cantidad y si ya estaba en la lista', () => {
    const listed = listItem({ source: 'AUTO', pantryProductId: 'p1' });
    const rows = buildGeneratePreview([milk, apples], [listed]);
    expect(rows).toEqual([{ product: milk, quantityToBuy: 1, alreadyListed: true }]);
  });
});

describe('productForm', () => {
  it('exige nombre, categoría y cantidad', () => {
    expect(productFormSchema.safeParse(INITIAL_PRODUCT_FORM_VALUES).success).toBe(false);
  });

  it('arma el payload con mínimo y fecha nulos cuando se vacían', () => {
    expect(toProductPayload({ ...INITIAL_PRODUCT_FORM_VALUES, name: ' Té ', category: 'GRAINS', quantity: 3 })).toEqual(
      { name: 'Té', category: 'GRAINS', unit: 'UNITS', quantity: 3, minQuantity: null, expiresAt: null }
    );
  });

  it('parte del producto guardado y recorta la fecha', () => {
    expect(toProductFormValues(product({ expiresAt: '2026-11-20T00:00:00.000Z' }))).toMatchObject({
      name: 'Leche entera',
      minQuantity: 2,
      expiresAt: '2026-11-20',
    });
  });
});

describe('isPantryKey', () => {
  it('reconoce las keys de la alacena y nada más', () => {
    expect(isPantryKey(API_PATHS.pantry.summary)).toBe(true);
    expect(isPantryKey(`${API_PATHS.pantry.products}?limit=100`)).toBe(true);
    expect(isPantryKey(API_PATHS.pantry.shoppingList)).toBe(true);
    expect(isPantryKey(API_PATHS.media.list)).toBe(false);
    expect(isPantryKey(42)).toBe(false);
  });
});
