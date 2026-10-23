import { describe, expect, it } from 'vitest';

import { createGatheringSchema } from '../split-expenses';
import { addShoppingListItemSchema } from '../pantry';

describe('split-expenses schemas', () => {
  it('accepts gathering date as YYYY-MM-DD', () => {
    expect(
      createGatheringSchema.parse({
        name: 'Asado',
        date: '2026-08-02',
        participants: [{ name: 'Lean' }],
      })
    ).toMatchObject({ date: '2026-08-02' });
  });
});

describe('pantry shopping list schema', () => {
  it('allows linked item without unit', () => {
    expect(
      addShoppingListItemSchema.parse({
        pantryProductId: 'prod1',
        quantityToBuy: 2,
      })
    ).toMatchObject({ pantryProductId: 'prod1' });
  });

  it('requires unit for manual items', () => {
    expect(() =>
      addShoppingListItemSchema.parse({
        name: 'Leche',
        quantityToBuy: 1,
      })
    ).toThrow();
  });
});
