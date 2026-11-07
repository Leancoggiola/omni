import { SWRConfig } from 'swr';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SWR_KEYS } from '@/shared/api';

import { usePantryMutations } from '../hooks/usePantryMutations';
import { usePantryProducts } from '../hooks/usePantryProducts';
import { useShoppingList } from '../hooks/useShoppingList';
import { useShoppingListMutations } from '../hooks/useShoppingListMutations';
import { listItem, product } from './fixtures';

import type { ReactNode } from 'react';

import { act, renderHook, waitFor } from '@testing-library/react';

const post = vi.fn();
const patch = vi.fn();
const del = vi.fn();

vi.mock('@/shared/api', async importOriginal => ({
  ...(await importOriginal<typeof import('@/shared/api')>()),
  api: {
    post: (...args: unknown[]) => post(...args),
    patch: (...args: unknown[]) => patch(...args),
    delete: (...args: unknown[]) => del(...args),
  },
}));

const fetcher = vi.fn();

function wrapper({ children }: { children: ReactNode }) {
  return (
    <SWRConfig value={{ provider: () => new Map(), fetcher, dedupingInterval: 0, revalidateOnFocus: false }}>
      {children}
    </SWRConfig>
  );
}

describe('hooks de la alacena', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetcher.mockResolvedValue({ items: [product()], total: 1, page: 1, limit: 100 });
  });

  it('usePantryProducts pide la página más grande y expone los ítems', async () => {
    const { result } = renderHook(() => usePantryProducts(), { wrapper });

    await waitFor(() => expect(result.current.products).toHaveLength(1));
    expect(fetcher).toHaveBeenCalledWith(`${SWR_KEYS.pantry.products}?limit=100`);
  });

  it('expone el error del fetch en la lista de compras', async () => {
    fetcher.mockRejectedValue(new Error('Sin conexión'));
    const { result } = renderHook(() => useShoppingList(), { wrapper });

    await waitFor(() => expect(result.current.error).toEqual(new Error('Sin conexión')));
  });

  it('crear un producto hace el POST y revalida las keys de la alacena', async () => {
    post.mockResolvedValue(product());
    const { result } = renderHook(() => ({ products: usePantryProducts(), mutations: usePantryMutations() }), {
      wrapper,
    });
    await waitFor(() => expect(result.current.products.products).toBeDefined());
    fetcher.mockClear();

    await act(async () => {
      await result.current.mutations.createProduct({ name: 'Té', category: 'GRAINS', unit: 'UNITS', quantity: 1 });
    });

    expect(post).toHaveBeenCalledWith(SWR_KEYS.pantry.products, expect.objectContaining({ name: 'Té' }));
    await waitFor(() => expect(fetcher).toHaveBeenCalled());
  });

  it('comprar, editar y destildar un ítem llaman a sus endpoints', async () => {
    patch.mockResolvedValue({});
    del.mockResolvedValue(undefined);
    const { result } = renderHook(() => useShoppingListMutations(), { wrapper });

    await act(async () => {
      await result.current.completeItem('i1', { quantityPurchased: 2, category: 'DAIRY' });
      await result.current.updateItem('i1', 3);
      await result.current.uncheckItem('i1');
      await result.current.clearChecked();
    });

    expect(patch).toHaveBeenCalledWith(SWR_KEYS.pantry.shoppingListItemComplete('i1'), {
      quantityPurchased: 2,
      category: 'DAIRY',
    });
    expect(patch).toHaveBeenCalledWith(SWR_KEYS.pantry.shoppingListItem('i1'), { quantityToBuy: 3 });
    expect(patch).toHaveBeenCalledWith(SWR_KEYS.pantry.shoppingListItemUncheck('i1'), {});
    expect(del).toHaveBeenCalledWith(SWR_KEYS.pantry.shoppingListChecked);
  });

  it('un fallo del write se propaga para que la UI lo muestre', async () => {
    post.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useShoppingListMutations(), { wrapper });

    await expect(result.current.addItem({ name: 'x', quantityToBuy: 1, unit: 'UNITS' })).rejects.toThrow('boom');
    expect(listItem().name).toBe('Café molido');
  });
});
