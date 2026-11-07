import { describe, expect, it } from 'vitest';

import { computeQuantityToBuy, formatPantryQuantity } from '../presentation';

describe('formatPantryQuantity', () => {
  it('usa singular solo con exactamente 1', () => {
    expect(formatPantryQuantity(1, 'PACKAGES')).toBe('1 paquete');
    expect(formatPantryQuantity(2, 'PACKAGES')).toBe('2 paquetes');
    expect(formatPantryQuantity(0, 'UNITS')).toBe('0 unidades');
    expect(formatPantryQuantity(1.5, 'UNITS')).toBe('1,5 unidades');
  });
});

describe('computeQuantityToBuy', () => {
  it('pide lo que falta para el mínimo, redondeado hacia arriba y nunca menos de 1', () => {
    expect(computeQuantityToBuy(1, 4)).toBe(3);
    expect(computeQuantityToBuy(1.5, 4)).toBe(3);
    expect(computeQuantityToBuy(2, 2)).toBe(1);
  });
});
