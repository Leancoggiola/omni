import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Modal } from 'react-native';

import { SHEET_EXIT_MS } from '@/shared/ui';

import { AddMediaSheet } from './AddMediaSheet';

import type { TmdbMediaResult } from '@omni/shared/media';

const mockSearch = jest.fn();

jest.mock('tamagui', () => jest.requireActual('@/test/tamaguiMock'));
jest.mock('@/core/theme', () => jest.requireActual('@/test/themeMock'));
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default
);
jest.mock('../hooks', () => ({ MIN_SEARCH_LENGTH: 2, useMediaSearch: (query: string) => mockSearch(query) }));

const RESULTS: TmdbMediaResult[] = [
  { id: 438631, media_type: 'movie', title: 'Dune', poster_path: '/a.jpg' },
  { id: 693134, media_type: 'movie', title: 'Dune: Part Two', poster_path: null },
  { id: 90228, media_type: 'tv', name: 'Dune: Prophecy', poster_path: null },
];

const EXISTING = new Set(['movie-693134']);
const mockRetry = jest.fn();

function renderSheet(onSubmit = jest.fn().mockResolvedValue(undefined)) {
  const onOpenChange = jest.fn();
  const onClosed = jest.fn();
  const props = { onOpenChange, onClosed, existingTmdbIds: EXISTING, onSubmit };
  const view = render(<AddMediaSheet open {...props} />);
  const close = () => view.rerender(<AddMediaSheet open={false} {...props} />);
  return { onSubmit, onOpenChange, onClosed, close };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSearch.mockReturnValue({
    results: RESULTS,
    error: undefined,
    isLoading: false,
    tooShort: false,
    retry: mockRetry,
  });
});

/** El cierre con Atrás llega como `onRequestClose` del Modal. */
const pressBack = () => act(() => screen.UNSAFE_getByType(Modal).props.onRequestClose());

describe('AddMediaSheet', () => {
  it('con menos de 2 caracteres pide seguir escribiendo', () => {
    mockSearch.mockReturnValue({ results: [], error: undefined, isLoading: false, tooShort: true, retry: mockRetry });
    renderSheet();

    expect(screen.getByText('Escribí al menos 2 caracteres')).toBeTruthy();
  });

  it('un error de búsqueda se muestra con ErrorState y Reintentar vuelve a buscar', () => {
    mockSearch.mockReturnValue({
      results: [],
      error: new Error('503'),
      isLoading: false,
      tooShort: false,
      retry: mockRetry,
    });
    renderSheet();

    expect(screen.getByText('No se pudo buscar en TMDB')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));
    expect(mockRetry).toHaveBeenCalled();
  });

  it('con una búsqueda nueva en curso, los resultados anteriores siguen con el spinner', () => {
    mockSearch.mockReturnValue({
      results: RESULTS,
      error: undefined,
      isLoading: true,
      tooShort: false,
      retry: mockRetry,
    });
    renderSheet();

    expect(screen.getByTestId('spinner')).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Dune, Película' })).toBeTruthy();
  });

  it('"Cerrar" y Atrás cierran el sheet', () => {
    const { onOpenChange } = renderSheet();

    fireEvent.press(screen.getByRole('button', { name: 'Cerrar' }));
    pressBack();
    expect(onOpenChange).toHaveBeenNthCalledWith(1, false);
    expect(onOpenChange).toHaveBeenNthCalledWith(2, false);
  });

  it('mientras envía no se cierra ni reenvía con un doble toque', async () => {
    let finish!: () => void;
    const onSubmit = jest.fn(() => new Promise<void>(resolve => (finish = resolve)));
    const { onOpenChange } = renderSheet(onSubmit);

    fireEvent.press(screen.getByRole('radio', { name: 'Dune, Película' }));
    const add = screen.getByRole('button', { name: 'Agregar' });
    fireEvent.press(add);
    fireEvent.press(add);
    pressBack();
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onOpenChange).not.toHaveBeenCalled();

    await act(async () => finish());
    expect(onOpenChange).toHaveBeenCalledWith(false);
    // Durante la salida "Agregar" sigue bloqueado.
    fireEvent.press(screen.getByRole('button', { name: 'Agregar' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('los que ya están en la lista salen deshabilitados y "Agregar" espera una selección', () => {
    renderSheet();

    expect(screen.getByRole('radio', { name: 'Dune: Part Two, Película, ya en tu lista' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Agregar' })).toBeDisabled();
  });

  it('elegir resultado y estado, y "Agregar" llama a onSubmit, cierra y avisa al ocultar el Modal', async () => {
    jest.useFakeTimers();
    const { onSubmit, onOpenChange, onClosed, close } = renderSheet();

    fireEvent.press(screen.getByRole('radio', { name: 'Dune: Prophecy, Serie' }));
    expect(screen.getByRole('radio', { name: 'Dune: Prophecy, Serie' })).toBeChecked();
    fireEvent.press(screen.getByRole('radio', { name: 'Viendo' }));
    await act(async () => fireEvent.press(screen.getByRole('button', { name: 'Agregar' })));

    expect(onSubmit).toHaveBeenCalledWith(90228, 'tv', 'watching');
    expect(onOpenChange).toHaveBeenCalledWith(false);

    // onClosed llega cuando termina la salida del Sheet: con el Modal visible un toast quedaría tapado.
    close();
    expect(onClosed).not.toHaveBeenCalled();
    act(() => jest.advanceTimersByTime(SHEET_EXIT_MS));
    expect(onClosed).toHaveBeenCalledTimes(1);
    expect(screen.UNSAFE_getByType(Modal).props.visible).toBe(false);
    jest.useRealTimers();
  });

  it('si falla, el error queda en el sheet y no se cierra', async () => {
    const { onOpenChange, onClosed } = renderSheet(jest.fn().mockRejectedValue(new Error('Ya está en tu lista')));

    fireEvent.press(screen.getByRole('radio', { name: 'Dune, Película' }));
    await act(async () => fireEvent.press(screen.getByRole('button', { name: 'Agregar' })));

    expect(screen.getByText('Ya está en tu lista')).toBeTruthy();
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(onClosed).not.toHaveBeenCalled();
  });

  it('editar la búsqueda descarta la selección', () => {
    renderSheet();

    fireEvent.press(screen.getByRole('radio', { name: 'Dune, Película' }));
    fireEvent.changeText(screen.getByLabelText('Título, obligatorio'), 'Dune 2');
    expect(screen.getByRole('button', { name: 'Agregar' })).toBeDisabled();
  });
});
