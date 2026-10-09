import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { actionSheet, confirm, notifyError, notifySuccess } from '@/shared/ui';

import { MediaScreen } from './MediaScreen';

import type { MediaItem } from '@omni/shared/media';

const mockUseMyMediaList = jest.fn();
const mockMutations = { addToList: jest.fn(), updateStatus: jest.fn(), removeFromList: jest.fn() };

jest.mock('tamagui', () => jest.requireActual('@/test/tamaguiMock'));
jest.mock('@/core/theme', () => jest.requireActual('@/test/themeMock'));
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default
);
// `Select` importa actionSheet por ruta relativa: se mockea el módulo, no solo el índice.
jest.mock('@/shared/ui/actionSheet/actionSheet', () => ({ actionSheet: jest.fn() }));
jest.mock('@/shared/ui', () => ({
  ...jest.requireActual('@/shared/ui'),
  confirm: jest.fn(),
  notifySuccess: jest.fn(),
  notifyError: jest.fn(),
}));
jest.mock('./hooks', () => ({
  MIN_SEARCH_LENGTH: 2,
  useMyMediaList: () => mockUseMyMediaList(),
  useMediaMutations: () => mockMutations,
  useMediaSearch: () => ({ results: [], error: undefined, isLoading: false, tooShort: true }),
}));

const mockActionSheet = jest.mocked(actionSheet);
const mockConfirm = jest.mocked(confirm);

const item = (
  id: string,
  title: string,
  mediaType: MediaItem['mediaType'],
  status: MediaItem['status']
): MediaItem => ({
  id,
  userId: 'u1',
  tmdbId: Number(id),
  mediaType,
  title,
  posterPath: null,
  status,
  createdAt: '',
  updatedAt: '',
});

const ITEMS = [
  item('1', 'Breaking Bad', 'tv', 'watched'),
  item('2', 'Dune: Part Two', 'movie', 'to_watch'),
  item('3', 'The Bear', 'tv', 'watching'),
];

function renderWith(list: Partial<{ data: MediaItem[]; error: Error; isLoading: boolean }> = { data: ITEMS }) {
  const mutate = jest.fn();
  mockUseMyMediaList.mockReturnValue({ data: undefined, error: undefined, isLoading: false, mutate, ...list });
  render(<MediaScreen />);
  return { mutate };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('MediaScreen · lista', () => {
  it('cada fila muestra título, tipo, estado tocable y tacho con el nombre del ítem', () => {
    renderWith();

    expect(screen.getByText('Dune: Part Two')).toBeTruthy();
    expect(screen.getAllByText('Serie')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Estado de The Bear: Viendo. Cambiar estado' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Eliminar Breaking Bad' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Agregar película o serie' })).toBeTruthy();
  });

  it('el error se muestra siempre (con la lista en cache) y Reintentar revalida', () => {
    const { mutate } = renderWith({ data: ITEMS, error: new Error('500') });

    expect(screen.getByText('No se pudo cargar tu lista')).toBeTruthy();
    expect(screen.queryByText('Breaking Bad')).toBeNull();
    fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));
    expect(mutate).toHaveBeenCalled();
  });

  it('mientras carga muestra el spinner y no el estado vacío', () => {
    renderWith({ isLoading: true });

    expect(screen.getByTestId('spinner')).toBeTruthy();
    expect(screen.queryByText('Tu lista está vacía')).toBeNull();
  });

  it('lista vacía ofrece agregar; con filtros sin coincidencias dice "No hay resultados"', () => {
    renderWith({ data: [] });
    expect(screen.getByText('Tu lista está vacía')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Agregar' })).toBeTruthy();
  });
});

describe('MediaScreen · filtros', () => {
  it('la búsqueda filtra por título y sin coincidencias muestra "No hay resultados"', () => {
    renderWith();

    fireEvent.changeText(screen.getByLabelText('Buscar en tu lista'), 'dune');
    expect(screen.getByText('Dune: Part Two')).toBeTruthy();
    expect(screen.queryByText('Breaking Bad')).toBeNull();

    fireEvent.changeText(screen.getByLabelText('Buscar en tu lista'), 'zzz');
    expect(screen.getByText('No hay resultados')).toBeTruthy();
  });

  it('el estado filtra con el SegmentedControl', () => {
    renderWith();

    fireEvent.press(screen.getByRole('radio', { name: 'Vista' }));
    expect(screen.getByText('Breaking Bad')).toBeTruthy();
    expect(screen.queryByText('The Bear')).toBeNull();
  });

  it('el tipo se elige en un actionSheet', async () => {
    mockActionSheet.mockResolvedValue('movie');
    renderWith();

    await act(async () => fireEvent.press(screen.getByRole('button', { name: 'Tipo: Todos' })));
    expect(mockActionSheet).toHaveBeenCalledWith(expect.objectContaining({ title: 'Tipo', value: 'all' }));
    expect(screen.getByText('Dune: Part Two')).toBeTruthy();
    expect(screen.queryByText('The Bear')).toBeNull();
  });
});

describe('MediaScreen · acciones', () => {
  it('la pill abre el actionSheet de estado con el actual y actualiza sin toast', async () => {
    mockActionSheet.mockResolvedValue('watched');
    mockMutations.updateStatus.mockResolvedValue(undefined);
    renderWith();

    await act(async () =>
      fireEvent.press(screen.getByRole('button', { name: 'Estado de The Bear: Viendo. Cambiar estado' }))
    );

    expect(mockActionSheet).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Cambiar estado', description: 'The Bear', value: 'watching' })
    );
    expect(mockMutations.updateStatus).toHaveBeenCalledWith('3', 'watched');
    expect(notifySuccess).not.toHaveBeenCalled();
  });

  it('cancelar o elegir el mismo estado no actualiza; si falla avisa con notifyError', async () => {
    renderWith();
    const pill = screen.getByRole('button', { name: 'Estado de The Bear: Viendo. Cambiar estado' });

    mockActionSheet.mockResolvedValueOnce(null);
    await act(async () => fireEvent.press(pill));
    mockActionSheet.mockResolvedValueOnce('watching');
    await act(async () => fireEvent.press(pill));
    expect(mockMutations.updateStatus).not.toHaveBeenCalled();

    mockActionSheet.mockResolvedValueOnce('to_watch');
    mockMutations.updateStatus.mockRejectedValueOnce(new Error('Sin conexión'));
    await act(async () => fireEvent.press(pill));
    expect(notifyError).toHaveBeenCalledWith('Sin conexión');
  });

  it('el tacho pide confirmación: cancelar no borra, confirmar borra y avisa', async () => {
    mockMutations.removeFromList.mockResolvedValue(undefined);
    renderWith();
    const trash = screen.getByRole('button', { name: 'Eliminar Dune: Part Two' });

    mockConfirm.mockResolvedValueOnce(false);
    await act(async () => fireEvent.press(trash));
    expect(mockConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ title: '¿Eliminar?', description: 'Esta acción no se puede deshacer.' })
    );
    expect(mockMutations.removeFromList).not.toHaveBeenCalled();

    mockConfirm.mockResolvedValueOnce(true);
    await act(async () => fireEvent.press(trash));
    expect(mockMutations.removeFromList).toHaveBeenCalledWith('2');
    expect(notifySuccess).toHaveBeenCalledWith('Eliminado de tu lista');
  });

  it('si el borrado falla avisa con notifyError', async () => {
    mockConfirm.mockResolvedValue(true);
    mockMutations.removeFromList.mockRejectedValue(new Error('No encontrado'));
    renderWith();

    await act(async () => fireEvent.press(screen.getByRole('button', { name: 'Eliminar Breaking Bad' })));
    expect(notifyError).toHaveBeenCalledWith('No encontrado');
    expect(notifySuccess).not.toHaveBeenCalled();
  });
});
