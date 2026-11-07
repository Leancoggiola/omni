import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HttpError } from '../common/http';

const tx = {
  pantryShoppingListItem: {
    findFirst: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
};

vi.mock('../common/db', () => ({ prisma: {} }));
vi.mock('../household/household.service', () => ({
  getHouseholdId: vi.fn(),
  withHousehold: (_userId: string, fn: (client: typeof tx, householdId: string) => unknown) => fn(tx, 'hh1'),
}));

import { uncheckShoppingListItem, updateShoppingListItem } from '../pantry/pantry.service';

const row = {
  id: 'item1',
  householdId: 'hh1',
  createdById: 'ana',
  updatedById: 'ana',
  pantryProductId: null,
  name: 'Leche',
  source: 'MANUAL' as const,
  quantityToBuy: 2,
  unit: 'UNITS' as const,
  checked: false,
  pantryProduct: null,
};

describe('updateShoppingListItem', () => {
  beforeEach(() => vi.clearAllMocks());

  it('guarda la cantidad y quién editó', async () => {
    tx.pantryShoppingListItem.findFirst.mockResolvedValue(row);
    tx.pantryShoppingListItem.update.mockResolvedValue({ ...row, quantityToBuy: 5, updatedById: 'beto' });

    const result = await updateShoppingListItem('beto', 'item1', { quantityToBuy: 5 });

    expect(tx.pantryShoppingListItem.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { quantityToBuy: 5, updatedById: 'beto' } })
    );
    expect(result).toMatchObject({ quantityToBuy: 5, createdById: 'ana', updatedById: 'beto' });
  });

  it('responde 404 si el ítem no es del hogar', async () => {
    tx.pantryShoppingListItem.findFirst.mockResolvedValue(null);

    await expect(updateShoppingListItem('beto', 'item1', { quantityToBuy: 5 })).rejects.toMatchObject({
      status: 404,
    });
    expect(tx.pantryShoppingListItem.update).not.toHaveBeenCalled();
  });

  it('responde 409 si el ítem ya está comprado', async () => {
    tx.pantryShoppingListItem.findFirst.mockResolvedValue({ ...row, checked: true });

    const promise = updateShoppingListItem('beto', 'item1', { quantityToBuy: 5 });

    await expect(promise).rejects.toBeInstanceOf(HttpError);
    await expect(promise).rejects.toMatchObject({ status: 409 });
    expect(tx.pantryShoppingListItem.update).not.toHaveBeenCalled();
  });
});

describe('uncheckShoppingListItem', () => {
  beforeEach(() => vi.clearAllMocks());

  it('destilda con guarda sobre checked y registra quién lo hizo', async () => {
    tx.pantryShoppingListItem.updateMany.mockResolvedValue({ count: 1 });
    tx.pantryShoppingListItem.findUniqueOrThrow.mockResolvedValue({ ...row, updatedById: 'beto' });

    const result = await uncheckShoppingListItem('beto', 'item1');

    expect(tx.pantryShoppingListItem.updateMany).toHaveBeenCalledWith({
      where: { id: 'item1', householdId: 'hh1', checked: true },
      data: { checked: false, updatedById: 'beto' },
    });
    expect(result).toMatchObject({ checked: false, updatedById: 'beto' });
  });

  it('responde 404 si el ítem no existe en el hogar', async () => {
    tx.pantryShoppingListItem.updateMany.mockResolvedValue({ count: 0 });
    tx.pantryShoppingListItem.findFirst.mockResolvedValue(null);

    await expect(uncheckShoppingListItem('beto', 'item1')).rejects.toMatchObject({ status: 404 });
  });

  it('responde 409 si el ítem no estaba marcado', async () => {
    tx.pantryShoppingListItem.updateMany.mockResolvedValue({ count: 0 });
    tx.pantryShoppingListItem.findFirst.mockResolvedValue(row);

    await expect(uncheckShoppingListItem('beto', 'item1')).rejects.toMatchObject({ status: 409 });
  });
});
