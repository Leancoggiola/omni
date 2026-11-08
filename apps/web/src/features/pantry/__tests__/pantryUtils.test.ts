import { describe, expect, it } from 'vitest';

import { SWR_KEYS } from '@/shared/api';

import {
  DEFAULT_PANTRY_FILTERS,
  filterPantryProducts,
  formatExpiryShort,
  hasActivePantryFilters,
} from '../utils/pantryFilters';
import { isPantryKey } from '../utils/pantryKeys';
import { INITIAL_PRODUCT_FORM_VALUES, productFormSchema, toProductPayload } from '../utils/productForm';
import { buildGeneratePreview, splitShoppingList } from '../utils/shoppingList';
import { listItem, product } from './fixtures';

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
    const result = productFormSchema.safeParse(INITIAL_PRODUCT_FORM_VALUES);
    expect(result.success).toBe(false);
  });

  it('arma el payload con mínimo y fecha nulos cuando se vacían', () => {
    expect(toProductPayload({ ...INITIAL_PRODUCT_FORM_VALUES, name: ' Té ', category: 'GRAINS', quantity: 3 })).toEqual(
      { name: 'Té', category: 'GRAINS', unit: 'UNITS', quantity: 3, minQuantity: null, expiresAt: null }
    );
  });
});

describe('isPantryKey', () => {
  it('reconoce las keys de la alacena y nada más', () => {
    expect(isPantryKey(SWR_KEYS.pantry.summary)).toBe(true);
    expect(isPantryKey(`${SWR_KEYS.pantry.products}?limit=100`)).toBe(true);
    expect(isPantryKey(SWR_KEYS.pantry.shoppingList)).toBe(true);
    expect(isPantryKey(SWR_KEYS.media.list)).toBe(false);
    expect(isPantryKey(42)).toBe(false);
  });
});
