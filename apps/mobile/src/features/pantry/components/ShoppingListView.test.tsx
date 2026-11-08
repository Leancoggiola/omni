import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { RefreshControl, Text } from 'react-native';

import { actionSheet } from '@/shared/ui/actionSheet/actionSheet';
import { confirm, notifyError, notifySuccess } from '@/shared/ui';

import { listItem, product } from '../fixtures';
import { ShoppingListView } from './ShoppingListView';

const mockList = jest.fn();
const mockSummary = jest.fn();
const mockProducts = jest.fn();
const mockMutations = {
  generate: jest.fn(),
  addItem: jest.fn(),
  completeItem: jest.fn(),
  updateItem: jest.fn(),
  uncheckItem: jest.fn(),
  removeItem: jest.fn(),
  clearChecked: jest.fn(),
};

jest.mock('tamagui', () => jest.requireActual('@/test/tamaguiMock'));
jest.mock('@/core/theme', () => jest.requireActual('@/test/themeMock'));
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default
);
jest.mock('@/shared/ui/actionSheet/actionSheet', () => ({ actionSheet: jest.fn() }));
jest.mock('@/shared/ui', () => ({
  ...jest.requireActual('@/shared/ui'),
  confirm: jest.fn(),
  notifySuccess: jest.fn(),
  notifyError: jest.fn(),
  useTabBarClearance: () => 0,
}));
jest.mock('@/core/household', () => ({
  useHousehold: () => ({ household: { members: [{}, {}] } }),
  useItemAuthor: (id: string | null) => (id ? { kind: 'member', name: 'Ana' } : undefined),
}));
jest.mock('../hooks/useShoppingList', () => ({ useShoppingList: () => mockList() }));
jest.mock('../hooks/usePantrySummary', () => ({ usePantrySummary: () => mockSummary() }));
jest.mock('../hooks/usePantryProducts', () => ({ usePantryProducts: () => mockProducts() }));
jest.mock('../hooks/useShoppingListMutations', () => ({ useShoppingListMutations: () => mockMutations }));
jest.mock('../hooks/usePantrySuggestions', () => ({
  usePantrySuggestions: () => ({
    suggestions: [{ id: 'p1', name: 'Leche entera', category: 'DAIRY', unit: 'PACKAGES' }],
  }),
}));

const LINKED = listItem({
  id: 'i1',
  name: 'Leche entera',
  source: 'AUTO',
  pantryProductId: 'p1',
  linkedProduct: { id: 'p1', name: 'Leche entera', quantity: 1, unit: 'PACKAGES' },
});
const FREE = listItem({ id: 'i2' });
const DONE = listItem({ id: 'i3', name: 'Fideos', checked: true });

function renderView(list: Record<string, unknown> = { items: [LINKED, FREE, DONE] }, lowStockCount = 0) {
  const retry = jest.fn().mockResolvedValue(undefined);
  mockList.mockReturnValue({ error: undefined, isLoading: false, mutate: retry, ...list });
  mockSummary.mockReturnValue({
    summary: { totalProducts: 3, expiringSoonCount: 0, lowStockCount, shoppingListCount: 2 },
  });
  mockProducts.mockReturnValue({ products: [product()] });
  render(<ShoppingListView header={<Text>Encabezado</Text>} />);
  return { retry };
}

beforeEach(() => {
  jest.clearAllMocks();
  Object.values(mockMutations).forEach(fn => fn.mockResolvedValue(undefined));
});

describe('ShoppingListView', () => {
  it('separa "Por comprar" y "Comprados" y muestra origen, stock y autor', () => {
    renderView();

    expect(screen.getByText('Por comprar')).toBeTruthy();
    expect(screen.getByText('Auto')).toBeTruthy();
    expect(screen.getByText('Manual')).toBeTruthy();
    expect(screen.getByText('En alacena: 1 paquete')).toBeTruthy();
    expect(screen.getAllByLabelText('Agregado por Ana').length).toBeGreaterThan(0);
    expect(screen.getByText('Fideos')).toBeTruthy();
  });

  it('el error sin datos se muestra y Reintentar revalida', () => {
    const { retry } = renderView({ items: undefined, error: new Error('500') });

    expect(screen.getByText('No se pudo cargar tu lista de compras')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));
    expect(retry).toHaveBeenCalled();
  });

  it('un error de revalidación con ítems en caché conserva la lista', () => {
    renderView({ items: [LINKED], error: new Error('500') });

    expect(screen.queryByText('No se pudo cargar tu lista de compras')).toBeNull();
    expect(screen.getByText('No se pudo actualizar la lista. Tirá para reintentar.')).toBeTruthy();
    expect(screen.getByText('Leche entera')).toBeTruthy();
  });

  it('mientras carga muestra skeleton y no el vacío', () => {
    renderView({ items: undefined, isLoading: true });

    expect(screen.getByRole('progressbar', { name: 'Cargando' })).toBeTruthy();
    expect(screen.queryByText('Tu lista está vacía')).toBeNull();
  });

  it('lista vacía: muestra el vacío', () => {
    renderView({ items: [] });

    expect(screen.getByText('Tu lista está vacía')).toBeTruthy();
  });

  it('tirar para actualizar revalida la lista', async () => {
    const { retry } = renderView();

    await act(async () => screen.UNSAFE_getByType(RefreshControl).props.onRefresh());

    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('un ítem vinculado se compra al instante', async () => {
    renderView();

    await act(async () => fireEvent.press(screen.getByRole('checkbox', { name: 'Marcar Leche entera como comprado' })));

    expect(mockMutations.completeItem).toHaveBeenCalledWith('i1');
    expect(notifySuccess).toHaveBeenCalledWith('Marcado como comprado');
  });

  it('un ítem libre pide categoría y compra con la cantidad', async () => {
    jest.useFakeTimers();
    jest.mocked(actionSheet).mockResolvedValue('GRAINS');
    renderView();

    fireEvent.press(screen.getByRole('checkbox', { name: 'Marcar Café molido como comprado' }));
    const confirmButton = () => screen.getByRole('button', { name: 'Marcar como comprado' });
    expect(confirmButton().props.accessibilityState.disabled).toBe(true);
    await act(async () => fireEvent.press(screen.getByRole('button', { name: 'Categoría: Elegí una categoría' })));
    fireEvent.changeText(screen.getByLabelText(/Cantidad comprada/), '2');
    await act(async () => fireEvent.press(confirmButton()));
    await act(async () => {
      jest.advanceTimersByTime(700);
    });

    expect(mockMutations.completeItem).toHaveBeenCalledWith('i2', { quantityPurchased: 2, category: 'GRAINS' });
    expect(notifySuccess).toHaveBeenCalledWith('Marcado como comprado');
    jest.useRealTimers();
  });

  it('destildar un comprado, quitar con confirmación y limpiar comprados', async () => {
    jest.mocked(confirm).mockResolvedValue(true);
    renderView();

    await act(async () => fireEvent.press(screen.getByRole('checkbox', { name: 'Destildar Fideos' })));
    expect(mockMutations.uncheckItem).toHaveBeenCalledWith('i3');

    await act(async () => fireEvent.press(screen.getByRole('button', { name: 'Quitar Café molido de la lista' })));
    expect(mockMutations.removeItem).toHaveBeenCalledWith('i2');

    await act(async () => fireEvent.press(screen.getByRole('button', { name: 'Limpiar comprados' })));
    expect(mockMutations.clearChecked).toHaveBeenCalled();
    expect(notifySuccess).toHaveBeenCalledWith('Comprados limpiados');
  });

  it('si quitar falla avisa el error', async () => {
    jest.mocked(confirm).mockResolvedValue(true);
    mockMutations.removeItem.mockRejectedValue(new Error('x'));
    renderView();

    await act(async () => fireEvent.press(screen.getByRole('button', { name: 'Quitar Café molido de la lista' })));

    expect(notifyError).toHaveBeenCalledWith('No se pudo quitar el ítem');
  });

  it('editar la cantidad guarda solo si cambió', async () => {
    jest.useFakeTimers();
    renderView();

    fireEvent.press(screen.getByRole('button', { name: 'Editar Café molido' }));
    expect(screen.getByRole('button', { name: 'Guardar' }).props.accessibilityState.disabled).toBe(true);
    fireEvent.changeText(screen.getByLabelText(/Cantidad a comprar/), '4');
    await act(async () => fireEvent.press(screen.getByRole('button', { name: 'Guardar' })));
    await act(async () => {
      jest.advanceTimersByTime(700);
    });

    expect(mockMutations.updateItem).toHaveBeenCalledWith('i2', 4);
    jest.useRealTimers();
  });

  it('con bajo stock ofrece generar y muestra la vista previa', async () => {
    jest.useFakeTimers();
    renderView(undefined, 1);

    expect(screen.getByText('1 producto con bajo stock.', { exact: false })).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Generar desde bajo stock' }));
    expect(screen.getByText('En alacena: 1 paquete · mínimo 2')).toBeTruthy();
    await act(async () => fireEvent.press(screen.getByRole('button', { name: 'Generar lista' })));
    await act(async () => {
      jest.advanceTimersByTime(700);
    });

    expect(mockMutations.generate).toHaveBeenCalled();
    expect(notifySuccess).toHaveBeenCalledWith('Lista generada');
    jest.useRealTimers();
  });

  it('agregar a la lista: una sugerencia vincula el producto', async () => {
    jest.useFakeTimers();
    renderView();

    fireEvent.press(screen.getByRole('button', { name: 'Agregar a la lista' }));
    fireEvent.changeText(screen.getByLabelText('Producto'), 'Lec');
    fireEvent.press(screen.getByRole('button', { name: 'Usar Leche entera' }));
    await act(async () => fireEvent.press(screen.getByRole('button', { name: 'Agregar' })));
    await act(async () => {
      jest.advanceTimersByTime(700);
    });

    expect(mockMutations.addItem).toHaveBeenCalledWith({ pantryProductId: 'p1', quantityToBuy: 1 });
    expect(notifySuccess).toHaveBeenCalledWith('Agregado a la lista');
    jest.useRealTimers();
  });
});
