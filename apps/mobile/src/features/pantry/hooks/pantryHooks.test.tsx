import { act, renderHook, waitFor } from '@testing-library/react-native';
import { SWRConfig } from 'swr';

import { PANTRY_LIST_REFRESH_MS } from '@omni/shared/pantry';

import { listItem, product } from '../fixtures';
import { usePantryMutations } from './usePantryMutations';
import { usePantryProducts } from './usePantryProducts';
import { usePantrySuggestions } from './usePantrySuggestions';
import { usePantrySummary } from './usePantrySummary';
import { useShoppingList } from './useShoppingList';
import { useShoppingListMutations } from './useShoppingListMutations';

import type { ReactNode } from 'react';

const mockApi = { post: jest.fn(), patch: jest.fn(), delete: jest.fn() };
const mockFetcher = jest.fn();
let mockFocused = true;

jest.mock('@react-navigation/native', () => ({ useIsFocused: () => mockFocused }));
jest.mock('@/shared/api', () => ({
  ...jest.requireActual('@/shared/api/keys'),
  fetcher: (key: string) => mockFetcher(key),
  api: {
    post: (...args: unknown[]) => mockApi.post(...args),
    patch: (...args: unknown[]) => mockApi.patch(...args),
    delete: (...args: unknown[]) => mockApi.delete(...args),
  },
}));

function wrapperWith(fetcher: jest.Mock) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <SWRConfig value={{ provider: () => new Map(), fetcher, dedupingInterval: 0 }}>{children}</SWRConfig>;
  };
}

const page = (ids: number[], total: number) => ({
  items: ids.map(i => product({ id: `p${i}` })),
  total,
  page: 1,
  limit: 100,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockFocused = true;
});

afterEach(() => jest.useRealTimers());

describe('usePantryProducts', () => {
  it('trae todas las páginas y las junta en una sola lista', async () => {
    mockFetcher.mockResolvedValueOnce(page([1, 2], 150)).mockResolvedValueOnce(page([3], 150));
    const { result } = renderHook(() => usePantryProducts(), { wrapper: wrapperWith(mockFetcher) });

    await waitFor(() => expect(result.current.products).toHaveLength(3));
    expect(mockFetcher).toHaveBeenNthCalledWith(1, '/api/pantry/products?limit=100');
    expect(mockFetcher).toHaveBeenNthCalledWith(2, '/api/pantry/products?limit=100&page=2');
  });

  it('expone el error del fetch', async () => {
    mockFetcher.mockRejectedValue(new Error('Sin conexión'));
    const { result } = renderHook(() => usePantryProducts(), { wrapper: wrapperWith(mockFetcher) });

    await waitFor(() => expect(result.current.error).toEqual(new Error('Sin conexión')));
  });

  it('refresca cada PANTRY_LIST_REFRESH_MS solo con la pantalla enfocada', async () => {
    jest.useFakeTimers({ advanceTimers: true });
    mockFetcher.mockResolvedValue(page([1], 1));
    const { result, rerender } = renderHook(() => usePantryProducts(), { wrapper: wrapperWith(mockFetcher) });
    await waitFor(() => expect(result.current.products).toHaveLength(1));

    await act(async () => {
      await jest.advanceTimersByTimeAsync(PANTRY_LIST_REFRESH_MS + 100);
    });
    await waitFor(() => expect(mockFetcher.mock.calls.length).toBeGreaterThan(1));

    mockFocused = false;
    rerender({});
    const calls = mockFetcher.mock.calls.length;
    await act(async () => {
      await jest.advanceTimersByTimeAsync(PANTRY_LIST_REFRESH_MS * 3);
    });
    expect(mockFetcher.mock.calls.length).toBe(calls);
  });
});

describe('usePantrySummary y useShoppingList', () => {
  it('piden su key', async () => {
    const fetcher = jest
      .fn()
      .mockImplementation((key: string) =>
        Promise.resolve(key.endsWith('summary') ? { totalProducts: 3 } : [listItem()])
      );
    const wrapper = wrapperWith(fetcher);
    const summary = renderHook(() => usePantrySummary(), { wrapper });
    const list = renderHook(() => useShoppingList(), { wrapper });

    await waitFor(() => expect(summary.result.current.summary).toEqual({ totalProducts: 3 }));
    await waitFor(() => expect(list.result.current.items).toHaveLength(1));
    expect(fetcher).toHaveBeenCalledWith('/api/pantry/summary');
    expect(fetcher).toHaveBeenCalledWith('/api/pantry/shopping-list');
  });
});

describe('usePantrySuggestions', () => {
  it('sin texto no pide nada y con texto busca con debounce', async () => {
    jest.useFakeTimers({ advanceTimers: true });
    const fetcher = jest.fn().mockResolvedValue([{ id: 'p1', name: 'Leche', category: 'DAIRY', unit: 'UNITS' }]);
    const { result, rerender } = renderHook(({ q }: { q: string }) => usePantrySuggestions(q), {
      wrapper: wrapperWith(fetcher),
      initialProps: { q: '  ' },
    });
    expect(fetcher).not.toHaveBeenCalled();

    rerender({ q: 'lec' });
    await act(async () => {
      await jest.advanceTimersByTimeAsync(300);
    });

    await waitFor(() => expect(result.current.suggestions).toHaveLength(1));
    expect(fetcher).toHaveBeenCalledWith('/api/pantry/products/suggest?limit=8&q=lec');
  });
});

describe('mutaciones', () => {
  function mutationsWithCache() {
    const fetcher = jest.fn().mockResolvedValue([]);
    const hook = renderHook(
      () => ({
        products: useShoppingList(),
        summary: usePantrySummary(),
        ...usePantryMutations(),
        ...useShoppingListMutations(),
      }),
      { wrapper: wrapperWith(fetcher) }
    );
    return { fetcher, hook };
  }

  it('crear un producto revalida las keys de la alacena con el filtro', async () => {
    mockApi.post.mockResolvedValue(product());
    const { fetcher, hook } = mutationsWithCache();
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));

    await act(async () => {
      await hook.result.current.createProduct({
        name: 'Leche',
        category: 'DAIRY',
        unit: 'UNITS',
        quantity: 1,
        minQuantity: null,
        expiresAt: null,
      });
    });

    expect(mockApi.post).toHaveBeenCalledWith('/api/pantry/products', expect.objectContaining({ name: 'Leche' }));
    await waitFor(() => expect(fetcher.mock.calls.length).toBeGreaterThanOrEqual(4));
  });

  it('actualizar y eliminar un producto pegan a su ruta', async () => {
    mockApi.patch.mockResolvedValue(product());
    mockApi.delete.mockResolvedValue(undefined);
    const { hook } = mutationsWithCache();

    await act(async () => {
      await hook.result.current.updateProduct('p1', { quantity: 3 });
      await hook.result.current.deleteProduct('p1');
    });

    expect(mockApi.patch).toHaveBeenCalledWith('/api/pantry/products/p1', { quantity: 3 });
    expect(mockApi.delete).toHaveBeenCalledWith('/api/pantry/products/p1');
  });

  it('la lista de compras: generar, agregar, comprar, editar, destildar, quitar y limpiar', async () => {
    mockApi.post.mockResolvedValue(listItem());
    mockApi.patch.mockResolvedValue({ item: listItem(), product: product() });
    mockApi.delete.mockResolvedValue(undefined);
    const { hook } = mutationsWithCache();

    await act(async () => {
      await hook.result.current.generate();
      await hook.result.current.addItem({ name: 'Té', quantityToBuy: 1, unit: 'UNITS' });
      await hook.result.current.completeItem('i1', { quantityPurchased: 2 });
      await hook.result.current.updateItem('i1', 4);
      await hook.result.current.uncheckItem('i1');
      await hook.result.current.removeItem('i1');
      await hook.result.current.clearChecked();
    });

    expect(mockApi.post).toHaveBeenCalledWith('/api/pantry/shopping-list/generate');
    expect(mockApi.post).toHaveBeenCalledWith('/api/pantry/shopping-list/items', expect.anything());
    expect(mockApi.patch).toHaveBeenCalledWith('/api/pantry/shopping-list/items/i1/complete', { quantityPurchased: 2 });
    expect(mockApi.patch).toHaveBeenCalledWith('/api/pantry/shopping-list/items/i1', { quantityToBuy: 4 });
    expect(mockApi.patch).toHaveBeenCalledWith('/api/pantry/shopping-list/items/i1/uncheck', {});
    expect(mockApi.delete).toHaveBeenCalledWith('/api/pantry/shopping-list/items/i1');
    expect(mockApi.delete).toHaveBeenCalledWith('/api/pantry/shopping-list/checked');
  });
});
