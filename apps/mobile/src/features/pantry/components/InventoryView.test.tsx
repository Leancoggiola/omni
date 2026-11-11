import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { RefreshControl, Text } from 'react-native';

import { actionSheet } from '@/shared/ui/actionSheet/actionSheet';
import { confirm, notifySuccess } from '@/shared/ui';

import { product } from '../fixtures';
import { InventoryView } from './InventoryView';

const mockProducts = jest.fn();
const mockSummary = jest.fn();
const mockMutations = { createProduct: jest.fn(), updateProduct: jest.fn(), deleteProduct: jest.fn() };

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
  useItemAuthor: () => undefined,
  useItemEditor: () => undefined,
}));
jest.mock('../hooks/usePantryProducts', () => ({ usePantryProducts: () => mockProducts() }));
jest.mock('../hooks/usePantrySummary', () => ({ usePantrySummary: () => mockSummary() }));
jest.mock('../hooks/usePantryMutations', () => ({ usePantryMutations: () => mockMutations }));

const SUMMARY = { totalProducts: 2, expiringSoonCount: 1, lowStockCount: 1, shoppingListCount: 0 };
const MILK = product();
const APPLES = product({ id: 'p2', name: 'Manzanas', category: 'FRUIT', isLowStock: false, isExpiringSoon: true });

function renderView(products: Record<string, unknown> = { products: [MILK, APPLES] }, summaryError?: Error) {
  const retryProducts = jest.fn().mockResolvedValue(undefined);
  const retrySummary = jest.fn().mockResolvedValue(undefined);
  mockProducts.mockReturnValue({ error: undefined, isLoading: false, mutate: retryProducts, ...products });
  mockSummary.mockReturnValue({ summary: SUMMARY, error: summaryError, mutate: retrySummary });
  render(<InventoryView header={<Text>Encabezado</Text>} />);
  return { retryProducts, retrySummary };
}

beforeEach(() => jest.clearAllMocks());

describe('InventoryView', () => {
  it('muestra el encabezado, los contadores y los productos con sus alertas', () => {
    renderView();

    expect(screen.getByText('Encabezado')).toBeTruthy();
    expect(screen.getByRole('button', { name: '1 con bajo stock' })).toBeTruthy();
    expect(screen.getByText('Leche entera')).toBeTruthy();
    expect(screen.getAllByText('Bajo stock')).toHaveLength(2);
    expect(screen.getByText('Por vencer')).toBeTruthy();
  });

  it('el error sin datos se muestra y Reintentar revalida las dos cargas', () => {
    const { retryProducts, retrySummary } = renderView({ products: undefined, error: new Error('500') });

    expect(screen.getByText('No se pudo cargar tu alacena')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));
    expect(retryProducts).toHaveBeenCalled();
    expect(retrySummary).toHaveBeenCalled();
  });

  it('un error de revalidación con productos en caché conserva la lista', () => {
    renderView({ products: [MILK], error: new Error('500') }, new Error('500'));

    expect(screen.queryByText('No se pudo cargar tu alacena')).toBeNull();
    expect(screen.getByText('Leche entera')).toBeTruthy();
  });

  it('mientras carga muestra skeleton y no el vacío', () => {
    renderView({ products: undefined, isLoading: true });

    expect(screen.getByRole('progressbar', { name: 'Cargando' })).toBeTruthy();
    expect(screen.queryByText('Tu alacena está vacía')).toBeNull();
  });

  it('sin productos muestra el vacío con la acción de agregar', () => {
    renderView({ products: [] });

    expect(screen.getByText('Tu alacena está vacía')).toBeTruthy();
    fireEvent.press(screen.getAllByRole('button', { name: 'Agregar producto' })[0]!);
    expect(screen.getByLabelText(/Nombre/)).toBeTruthy();
  });

  it('buscar sin coincidencias muestra "Sin resultados para" y Limpiar filtros los quita', () => {
    renderView();

    fireEvent.changeText(screen.getByLabelText('Buscar en tu alacena'), 'quinoa');
    expect(screen.getByText('Sin resultados para «quinoa»')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Limpiar filtros' }));
    expect(screen.getByText('Leche entera')).toBeTruthy();
  });

  it('tocar "Bajo stock" filtra y volver a tocar lo quita', () => {
    renderView();

    fireEvent.press(screen.getByRole('button', { name: '1 con bajo stock' }));
    expect(screen.queryByText('Manzanas')).toBeNull();
    fireEvent.press(screen.getByRole('button', { name: '1 con bajo stock' }));
    expect(screen.getByText('Manzanas')).toBeTruthy();
  });

  it('tirar para actualizar revalida productos y resumen', async () => {
    const { retryProducts, retrySummary } = renderView();

    await act(async () => screen.UNSAFE_getByType(RefreshControl).props.onRefresh());

    expect(retryProducts).toHaveBeenCalledTimes(1);
    expect(retrySummary).toHaveBeenCalledTimes(1);
  });

  it('alta: agrega el producto y avisa al cerrar la hoja', async () => {
    jest.useFakeTimers();
    jest.mocked(actionSheet).mockResolvedValue('GRAINS');
    mockMutations.createProduct.mockResolvedValue(MILK);
    renderView();

    fireEvent.press(screen.getByRole('button', { name: 'Agregar producto' }));
    fireEvent.changeText(screen.getByLabelText(/Nombre/), 'Té');
    await act(async () => fireEvent.press(screen.getByRole('button', { name: 'Categoría: Elegí una categoría' })));
    fireEvent.changeText(screen.getByLabelText(/Cantidad/), '3');
    await act(async () => {
      fireEvent.press(screen.getAllByRole('button', { name: 'Agregar producto' }).at(-1)!);
    });
    await act(async () => {
      jest.advanceTimersByTime(700);
    });

    expect(mockMutations.createProduct).toHaveBeenCalledWith({
      name: 'Té',
      category: 'GRAINS',
      unit: 'UNITS',
      quantity: 3,
      minQuantity: null,
      expiresAt: null,
    });
    expect(notifySuccess).toHaveBeenCalledWith('Producto agregado');
    jest.useRealTimers();
  });

  it('abrir un producto y eliminarlo cierra la hoja, confirma y borra', async () => {
    jest.useFakeTimers();
    jest.mocked(confirm).mockResolvedValue(true);
    mockMutations.deleteProduct.mockResolvedValue(undefined);
    renderView();

    fireEvent.press(screen.getByRole('button', { name: /^Leche entera/ }));
    fireEvent.press(screen.getByRole('button', { name: 'Eliminar' }));
    await act(async () => {
      jest.advanceTimersByTime(700);
    });

    expect(confirm).toHaveBeenCalledWith(expect.objectContaining({ title: '¿Eliminar Leche entera?' }));
    expect(mockMutations.deleteProduct).toHaveBeenCalledWith('p1');
    expect(notifySuccess).toHaveBeenCalledWith('Producto eliminado');
    jest.useRealTimers();
  });
});
