import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/__tests__/helpers';

import { InventoryView } from '../components/InventoryView';
import { product } from './fixtures';

import type { PantrySummary } from '@omni/shared/pantry';

import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mocks = vi.hoisted(() => ({
  products: { products: undefined as unknown, isLoading: false, error: undefined as unknown, mutate: vi.fn() },
  summary: { summary: undefined as unknown, error: undefined as unknown, mutate: vi.fn() },
}));

vi.mock('../hooks/usePantryProducts', () => ({ usePantryProducts: () => mocks.products }));
vi.mock('../hooks/usePantrySummary', () => ({ usePantrySummary: () => mocks.summary }));
vi.mock('../hooks/usePantryMutations', () => ({
  usePantryMutations: () => ({ createProduct: vi.fn(), updateProduct: vi.fn(), deleteProduct: vi.fn() }),
}));
vi.mock('@/core/household', () => ({ useHousehold: () => ({ household: null }), useItemAuthor: () => undefined }));

const summary: PantrySummary = { totalProducts: 2, expiringSoonCount: 0, lowStockCount: 1, shoppingListCount: 3 };

const renderView = () =>
  renderWithProviders(<InventoryView addOpened={false} onAddOpenedChange={vi.fn()} onOpenShoppingList={vi.fn()} />);

describe('InventoryView', () => {
  beforeEach(() => {
    mocks.products = { products: undefined, isLoading: false, error: undefined, mutate: vi.fn() };
    mocks.summary = { summary, error: undefined, mutate: vi.fn() };
  });

  it('si falla la carga muestra el error con reintento, no la alacena vacía', async () => {
    mocks.products = { ...mocks.products, error: new Error('x'), products: [] };
    renderView();

    expect(screen.getByText('No se pudo cargar tu alacena')).toBeInTheDocument();
    expect(screen.queryByText('Tu alacena está vacía')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(mocks.products.mutate).toHaveBeenCalled();
  });

  it('muestra el error aunque solo falle el resumen', () => {
    mocks.products = { ...mocks.products, products: [product()] };
    mocks.summary = { ...mocks.summary, error: new Error('x') };
    renderView();

    expect(screen.getByText('No se pudo cargar tu alacena')).toBeInTheDocument();
  });

  it('sin productos muestra la alacena vacía', () => {
    mocks.products = { ...mocks.products, products: [] };
    renderView();

    expect(screen.getByText('Tu alacena está vacía')).toBeInTheDocument();
  });

  it('la búsqueda sin coincidencias dice "Sin resultados para …" y limpia los filtros', async () => {
    mocks.products = { ...mocks.products, products: [product()] };
    renderView();

    await userEvent.type(screen.getByRole('textbox', { name: 'Buscar en tu alacena' }), 'zzz');
    expect(screen.getByText('Sin resultados para «zzz»')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }));
    expect(screen.getByRole('button', { name: 'Ver y editar Leche entera' })).toBeInTheDocument();
  });

  it('tocar "Bajo stock" filtra la tabla y volver a tocarlo la restaura', async () => {
    mocks.products = {
      ...mocks.products,
      products: [product(), product({ id: 'p2', name: 'Arroz', isLowStock: false })],
    };
    renderView();

    await userEvent.click(screen.getByRole('button', { name: /Bajo stock/ }));
    expect(screen.queryByRole('button', { name: 'Ver y editar Arroz' })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Bajo stock/ }));
    expect(screen.getByRole('button', { name: 'Ver y editar Arroz' })).toBeInTheDocument();
  });
});
