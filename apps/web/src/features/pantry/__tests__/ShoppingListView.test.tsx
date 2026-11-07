import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/__tests__/helpers';

import { ShoppingListView } from '../components/ShoppingListView';
import { listItem } from './fixtures';

import type { PantryShoppingListItem } from '@omni/shared/pantry';

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mocks = vi.hoisted(() => ({
  list: {
    items: undefined as PantryShoppingListItem[] | undefined,
    isLoading: false,
    error: undefined as unknown,
    mutate: vi.fn(),
  },
  mutations: {
    generate: vi.fn(),
    addItem: vi.fn(),
    completeItem: vi.fn(),
    updateItem: vi.fn(),
    uncheckItem: vi.fn(),
    removeItem: vi.fn(),
    clearChecked: vi.fn(),
  },
}));

vi.mock('../hooks/useShoppingList', () => ({ useShoppingList: () => mocks.list }));
vi.mock('../hooks/useShoppingListMutations', () => ({ useShoppingListMutations: () => mocks.mutations }));
vi.mock('../hooks/usePantrySummary', () => ({
  usePantrySummary: () => ({
    summary: { totalProducts: 1, expiringSoonCount: 0, lowStockCount: 0, shoppingListCount: 1 },
  }),
}));
vi.mock('../hooks/usePantryProducts', () => ({ usePantryProducts: () => ({ products: [] }) }));
vi.mock('../hooks/usePantrySuggestions', () => ({ usePantrySuggestions: () => ({ suggestions: [] }) }));
vi.mock('@/core/household', () => ({ useHousehold: () => ({ household: null }), useItemAuthor: () => undefined }));

describe('ShoppingListView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.list = { items: [], isLoading: false, error: undefined, mutate: vi.fn() };
    Object.values(mocks.mutations).forEach(fn => fn.mockResolvedValue(undefined));
  });

  it('si falla la carga muestra el error con reintento, no la lista vacía', async () => {
    mocks.list = { ...mocks.list, items: undefined, error: new Error('x') };
    renderWithProviders(<ShoppingListView />);

    expect(screen.getByText('No se pudo cargar tu lista de compras')).toBeInTheDocument();
    expect(screen.queryByText('Tu lista está vacía')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(mocks.list.mutate).toHaveBeenCalled();
  });

  it('sin ítems muestra la lista vacía', () => {
    renderWithProviders(<ShoppingListView />);

    expect(screen.getByText('Tu lista está vacía')).toBeInTheDocument();
  });

  it('marcar un ítem vinculado lo compra al instante', async () => {
    mocks.list = { ...mocks.list, items: [listItem({ pantryProductId: 'p1' })] };
    renderWithProviders(<ShoppingListView />);

    await userEvent.click(screen.getByRole('checkbox', { name: 'Marcar Café molido como comprado' }));

    expect(mocks.mutations.completeItem).toHaveBeenCalledWith('i1');
  });

  it('un ítem libre pide la categoría en un modal antes de comprarlo', async () => {
    mocks.list = { ...mocks.list, items: [listItem()] };
    renderWithProviders(<ShoppingListView />);

    await userEvent.click(screen.getByRole('checkbox', { name: 'Marcar Café molido como comprado' }));

    expect(mocks.mutations.completeItem).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Marcar como comprado' })).toBeDisabled();
  });

  it('destildar un comprado llama a uncheck', async () => {
    mocks.list = { ...mocks.list, items: [listItem({ checked: true })] };
    renderWithProviders(<ShoppingListView />);

    await userEvent.click(screen.getByRole('checkbox', { name: 'Destildar Café molido' }));

    await waitFor(() => expect(mocks.mutations.uncheckItem).toHaveBeenCalledWith('i1'));
  });

  it('agrega un ítem manual con nombre, cantidad y unidad', async () => {
    renderWithProviders(<ShoppingListView />);

    await userEvent.type(screen.getByRole('combobox', { name: 'Producto' }), 'Sal');
    await userEvent.click(screen.getByRole('button', { name: 'Agregar' }));

    await waitFor(() =>
      expect(mocks.mutations.addItem).toHaveBeenCalledWith({ name: 'Sal', quantityToBuy: 1, unit: 'UNITS' })
    );
  });
});
