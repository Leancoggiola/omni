import { act, fireEvent, render, screen, userEvent } from '@testing-library/react-native';

import { ApiError } from '@omni/shared/api';

import { actionSheet, confirm, notifyError, notifySuccess, SHEET_EXIT_MS } from '@/shared/ui';
import { getByHostProps, getByHostType } from '@/test/hostQueries';

import { MediaScreen } from './MediaScreen';

import type { MediaItem, TmdbMediaResult } from '@omni/shared/media';

const mockUseMyMediaList = jest.fn();
const mockSearch = jest.fn();
const mockMutations = { addToList: jest.fn(), updateStatus: jest.fn(), removeFromList: jest.fn() };

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
}));
const mockAuthor = jest.fn();

jest.mock('@/core/household', () => ({ useItemAuthor: (id: string | null) => mockAuthor(id) }));
jest.mock('./hooks/useMyMediaList', () => ({ useMyMediaList: () => mockUseMyMediaList() }));
jest.mock('./hooks/useMediaMutations', () => ({ useMediaMutations: () => mockMutations }));
jest.mock('./hooks/useMediaSearch', () => ({ MIN_SEARCH_LENGTH: 2, useMediaSearch: () => mockSearch() }));

const mockActionSheet = jest.mocked(actionSheet);
const mockConfirm = jest.mocked(confirm);

const item = (
  id: string,
  title: string,
  mediaType: MediaItem['mediaType'],
  status: MediaItem['status']
): MediaItem => ({
  id,
  createdById: 'u1',
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

async function renderWith(list: Partial<{ data: MediaItem[]; error: Error; isLoading: boolean }> = { data: ITEMS }) {
  const mutate = jest.fn().mockResolvedValue(undefined);
  mockUseMyMediaList.mockReturnValue({ data: undefined, error: undefined, isLoading: false, mutate, ...list });
  await render(<MediaScreen />);
  return { mutate };
}

const DUNE: TmdbMediaResult = { id: 438631, media_type: 'movie', title: 'Dune', poster_path: null };

beforeEach(() => {
  jest.clearAllMocks();
  mockSearch.mockReturnValue({ results: [], error: undefined, isLoading: false, tooShort: true, retry: jest.fn() });
});

describe('MediaScreen · lista', () => {
  it('cada fila muestra título, tipo, estado tocable y tacho con el nombre del ítem', async () => {
    await renderWith();

    expect(screen.getByText('Dune: Part Two')).toBeTruthy();
    expect(screen.getAllByText('Serie')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Estado de The Bear: Viendo. Cambiar estado' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Eliminar Breaking Bad' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Agregar película o serie' })).toBeTruthy();
  });

  it('el error se muestra siempre (con la lista en cache) y Reintentar revalida', async () => {
    const { mutate } = await renderWith({ data: ITEMS, error: new Error('500') });

    expect(screen.getByText('No se pudo cargar tu lista')).toBeTruthy();
    expect(screen.queryByText('Breaking Bad')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));
    expect(mutate).toHaveBeenCalled();
  });

  it('tirar para actualizar revalida la lista', async () => {
    const { mutate } = await renderWith();

    await userEvent.setup().pullToRefresh(getByHostType('RCTScrollView'));

    expect(mutate).toHaveBeenCalledTimes(1);
  });

  it('mientras carga muestra las filas skeleton ("Cargando") y no el estado vacío', async () => {
    await renderWith({ isLoading: true });

    expect(screen.getByRole('progressbar', { name: 'Cargando' })).toBeTruthy();
    expect(screen.queryByText('Tu lista está vacía')).toBeNull();
  });

  it('lista vacía ofrece agregar; con filtros sin coincidencias dice "No hay resultados"', async () => {
    await renderWith({ data: [] });
    expect(screen.getByText('Tu lista está vacía')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Agregar' })).toBeTruthy();
  });
});

describe('MediaScreen · vista', () => {
  it('abre en lista y el grupo Vista permite pasar a Grilla y volver', async () => {
    await renderWith();

    expect(getByHostProps({ accessibilityRole: 'radiogroup', accessibilityLabel: 'Vista' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Lista', selected: true })).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Grilla' }));
    expect(screen.getByRole('button', { name: 'Grilla', selected: true })).toBeTruthy();
    expect(screen.getByText('Dune: Part Two')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Eliminar Dune: Part Two' })).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Lista' }));
    expect(screen.getByRole('button', { name: 'Lista', selected: true })).toBeTruthy();
  });

  it('en grilla los filtros y las acciones funcionan igual', async () => {
    mockActionSheet.mockResolvedValue('watched');
    mockMutations.updateStatus.mockResolvedValue(undefined);
    await renderWith();
    await fireEvent.press(screen.getByRole('button', { name: 'Grilla' }));

    await fireEvent.changeText(screen.getByLabelText('Buscar en tu lista'), 'bear');
    expect(screen.queryByText('Breaking Bad')).toBeNull();
    await act(
      async () =>
        await fireEvent.press(screen.getByRole('button', { name: 'Estado de The Bear: Viendo. Cambiar estado' }))
    );
    expect(mockMutations.updateStatus).toHaveBeenCalledWith('3', 'watched');

    await fireEvent.changeText(screen.getByLabelText('Buscar en tu lista'), 'zzz');
    expect(screen.getByText('No hay resultados')).toBeTruthy();
  });

  it('en grilla, cargando muestra el skeleton', async () => {
    await renderWith({ isLoading: true });
    await fireEvent.press(screen.getByRole('button', { name: 'Grilla' }));
    expect(screen.getByRole('progressbar', { name: 'Cargando' })).toBeTruthy();
  });

  it('en grilla el error de SWR se renderiza y no hay tarjetas', async () => {
    await renderWith({ data: ITEMS, error: new Error('500') });
    await fireEvent.press(screen.getByRole('button', { name: 'Grilla' }));

    expect(screen.getByText('No se pudo cargar tu lista')).toBeTruthy();
    expect(screen.queryByText('Breaking Bad')).toBeNull();
  });
});

describe('MediaScreen · autoría', () => {
  beforeEach(() => mockAuthor.mockReset());

  it('cada fila muestra quién la agregó, con "Vos" para la propia sesión', async () => {
    mockAuthor.mockImplementation((id: string | null) =>
      id === 'u1' ? { kind: 'self', name: 'Leandro', avatarUrl: null } : undefined
    );
    await renderWith();

    expect(screen.getAllByLabelText('Agregado por Vos').length).toBeGreaterThan(0);
  });

  it('sin autor resuelto no muestra nada', async () => {
    await renderWith();

    expect(screen.queryByLabelText(/Agregado por/)).toBeNull();
  });
});

describe('MediaScreen · filtros', () => {
  it('la búsqueda filtra por título y sin coincidencias muestra "No hay resultados"', async () => {
    await renderWith();

    await fireEvent.changeText(screen.getByLabelText('Buscar en tu lista'), 'dune');
    expect(screen.getByText('Dune: Part Two')).toBeTruthy();
    expect(screen.queryByText('Breaking Bad')).toBeNull();

    await fireEvent.changeText(screen.getByLabelText('Buscar en tu lista'), 'zzz');
    expect(screen.getByText('No hay resultados')).toBeTruthy();
  });

  it('el estado filtra con el SegmentedControl', async () => {
    await renderWith();

    await fireEvent.press(screen.getByRole('radio', { name: 'Vista' }));
    expect(screen.getByText('Breaking Bad')).toBeTruthy();
    expect(screen.queryByText('The Bear')).toBeNull();
  });

  it('el tipo se elige en un actionSheet', async () => {
    mockActionSheet.mockResolvedValue('movie');
    await renderWith();

    await act(async () => await fireEvent.press(screen.getByRole('button', { name: 'Tipo: Todos' })));
    expect(mockActionSheet).toHaveBeenCalledWith(expect.objectContaining({ title: 'Tipo', value: 'all' }));
    expect(screen.getByText('Dune: Part Two')).toBeTruthy();
    expect(screen.queryByText('The Bear')).toBeNull();
  });
});

describe('MediaScreen · acciones', () => {
  it('la pill abre el actionSheet de estado con el actual y actualiza sin toast', async () => {
    mockActionSheet.mockResolvedValue('watched');
    mockMutations.updateStatus.mockResolvedValue(undefined);
    await renderWith();

    await act(
      async () =>
        await fireEvent.press(screen.getByRole('button', { name: 'Estado de The Bear: Viendo. Cambiar estado' }))
    );

    expect(mockActionSheet).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Cambiar estado', description: 'The Bear', value: 'watching' })
    );
    expect(mockMutations.updateStatus).toHaveBeenCalledWith('3', 'watched');
    expect(notifySuccess).not.toHaveBeenCalled();
  });

  it('cancelar o elegir el mismo estado no actualiza; si falla avisa con notifyError', async () => {
    await renderWith();
    const pill = screen.getByRole('button', { name: 'Estado de The Bear: Viendo. Cambiar estado' });

    mockActionSheet.mockResolvedValueOnce(null);
    await act(async () => await fireEvent.press(pill));
    mockActionSheet.mockResolvedValueOnce('watching');
    await act(async () => await fireEvent.press(pill));
    expect(mockMutations.updateStatus).not.toHaveBeenCalled();

    mockActionSheet.mockResolvedValueOnce('to_watch');
    mockMutations.updateStatus.mockRejectedValueOnce(new TypeError('Network request failed'));
    await act(async () => await fireEvent.press(pill));
    expect(notifyError).toHaveBeenCalledWith('No se pudo actualizar el estado');
  });

  it('el tacho pide confirmación: cancelar no borra, confirmar borra y avisa', async () => {
    mockMutations.removeFromList.mockResolvedValue(undefined);
    await renderWith();
    const trash = screen.getByRole('button', { name: 'Eliminar Dune: Part Two' });

    mockConfirm.mockResolvedValueOnce(false);
    await act(async () => await fireEvent.press(trash));
    expect(mockConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ title: '¿Eliminar?', description: 'Esta acción no se puede deshacer.' })
    );
    expect(mockMutations.removeFromList).not.toHaveBeenCalled();

    mockConfirm.mockResolvedValueOnce(true);
    await act(async () => await fireEvent.press(trash));
    expect(mockMutations.removeFromList).toHaveBeenCalledWith('2');
    expect(notifySuccess).toHaveBeenCalledWith('Eliminado de tu lista');
  });

  it('un doble toque en el tacho abre un solo confirm (y borra una vez)', async () => {
    let answer!: (value: boolean) => void;
    mockConfirm.mockImplementation(() => new Promise<boolean>(resolve => (answer = resolve)));
    mockMutations.removeFromList.mockResolvedValue(undefined);
    await renderWith();
    const trash = screen.getByRole('button', { name: 'Eliminar The Bear' });

    await fireEvent.press(trash);
    await fireEvent.press(trash);
    expect(mockConfirm).toHaveBeenCalledTimes(1);

    await act(async () => answer(true));
    expect(mockMutations.removeFromList).toHaveBeenCalledTimes(1);
  });

  it('si el borrado falla avisa con notifyError', async () => {
    mockConfirm.mockResolvedValue(true);
    mockMutations.removeFromList.mockRejectedValue(new ApiError('No encontrado', 404));
    await renderWith();

    await act(async () => await fireEvent.press(screen.getByRole('button', { name: 'Eliminar Breaking Bad' })));
    expect(notifyError).toHaveBeenCalledWith('No encontrado');
    expect(notifySuccess).not.toHaveBeenCalled();
  });
});

describe('MediaScreen · agregar', () => {
  afterEach(() => jest.useRealTimers());

  it('reabrir el sheet durante su salida no tapa el aviso: sale al ocultarse el Modal nuevo', async () => {
    jest.useFakeTimers();
    mockSearch.mockReturnValue({
      results: [DUNE],
      error: undefined,
      isLoading: false,
      tooShort: false,
      retry: jest.fn(),
    });
    mockMutations.addToList.mockResolvedValue(undefined);
    await renderWith();
    const fab = screen.getByRole('button', { name: 'Agregar película o serie' });

    await fireEvent.press(fab);
    await fireEvent.press(screen.getByRole('radio', { name: 'Dune, Película' }));
    await act(async () => await fireEvent.press(screen.getByRole('button', { name: 'Agregar' })));
    expect(mockMutations.addToList).toHaveBeenCalledWith(438631, 'movie', 'to_watch');

    await fireEvent.press(fab);
    await act(() => jest.advanceTimersByTime(SHEET_EXIT_MS));
    expect(notifySuccess).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole('button', { name: 'Cerrar' }));
    await act(() => jest.advanceTimersByTime(SHEET_EXIT_MS));
    expect(notifySuccess).toHaveBeenCalledTimes(1);
    expect(notifySuccess).toHaveBeenCalledWith('Agregado a tu lista');
  });

  it('si la pantalla se desmonta durante la salida, el aviso no se pierde', async () => {
    mockSearch.mockReturnValue({
      results: [DUNE],
      error: undefined,
      isLoading: false,
      tooShort: false,
      retry: jest.fn(),
    });
    mockMutations.addToList.mockResolvedValue(undefined);
    mockUseMyMediaList.mockReturnValue({ data: ITEMS, error: undefined, isLoading: false, mutate: jest.fn() });
    const view = await render(<MediaScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Agregar película o serie' }));
    await fireEvent.press(screen.getByRole('radio', { name: 'Dune, Película' }));
    await act(async () => await fireEvent.press(screen.getByRole('button', { name: 'Agregar' })));
    expect(notifySuccess).not.toHaveBeenCalled();

    await view.unmount();
    expect(notifySuccess).toHaveBeenCalledWith('Agregado a tu lista');
  });
});
