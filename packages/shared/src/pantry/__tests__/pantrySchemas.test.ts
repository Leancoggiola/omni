import { describe, expect, it } from 'vitest';

import { updateShoppingListItemSchema } from '..';

describe('updateShoppingListItemSchema', () => {
  it('acepta una cantidad positiva', () => {
    expect(updateShoppingListItemSchema.safeParse({ quantityToBuy: 3 }).success).toBe(true);
  });

  it('rechaza cero, negativos y la cantidad ausente', () => {
    expect(updateShoppingListItemSchema.safeParse({ quantityToBuy: 0 }).success).toBe(false);
    expect(updateShoppingListItemSchema.safeParse({ quantityToBuy: -1 }).success).toBe(false);
    expect(updateShoppingListItemSchema.safeParse({}).success).toBe(false);
  });

  it('rechaza campos que no se editan', () => {
    expect(updateShoppingListItemSchema.safeParse({ quantityToBuy: 1, name: 'x' }).success).toBe(false);
  });
});
