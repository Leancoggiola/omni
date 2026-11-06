import { fireEvent, render, screen } from '@testing-library/react-native';

import { WatchingCard } from './WatchingCard';

import type { MediaItem } from '@omni/shared/media';

const mockUseWatchingMedia = jest.fn();
const mockNavigate = jest.fn();
const mockRetry = jest.fn();

jest.mock('tamagui', () => jest.requireActual('@/test/tamaguiMock'));
jest.mock('@/core/theme', () => ({
  ...jest.requireActual('@/test/themeMock'),
  useColorSchemeControl: () => ({ colorScheme: 'light' }),
}));
jest.mock('expo-router', () => ({ useRouter: () => ({ navigate: mockNavigate }) }));
jest.mock('../hooks/useWatchingMedia', () => ({
  WATCHING_LIMIT: 3,
  useWatchingMedia: () => mockUseWatchingMedia(),
}));

const media = (id: string, title: string, mediaType: MediaItem['mediaType']): MediaItem => ({
  id,
  createdById: 'u1',
  tmdbId: Number(id),
  mediaType,
  title,
  posterPath: null,
  status: 'watching',
  createdAt: '',
  updatedAt: '',
});

const state = (value: Record<string, unknown>) =>
  mockUseWatchingMedia.mockReturnValue({ items: [], isLoading: false, error: undefined, retry: mockRetry, ...value });

beforeEach(() => {
  jest.clearAllMocks();
});

describe('WatchingCard', () => {
  it('muestra el encabezado y "Ver todo" lleva a Películas', () => {
    state({});
    render(<WatchingCard />);
    expect(screen.getByText('Seguís viendo')).toBeTruthy();
    fireEvent.press(screen.getByRole('link', { name: 'Ver todo' }));
    expect(mockNavigate).toHaveBeenCalledWith('/media');
  });

  it('cada ítem muestra título, tipo y pill "Viendo", y la fila navega a Películas', () => {
    state({ items: [media('1', 'The Bear', 'tv'), media('2', 'Dune', 'movie')] });
    render(<WatchingCard />);
    expect(screen.getByText('The Bear')).toBeTruthy();
    expect(screen.getByText('Serie')).toBeTruthy();
    expect(screen.getByText('Película')).toBeTruthy();
    expect(screen.getAllByText('Viendo')).toHaveLength(2);
    fireEvent.press(screen.getByRole('button', { name: /The Bear/ }));
    expect(mockNavigate).toHaveBeenCalledWith('/media');
  });

  it('mientras carga muestra el skeleton y no el vacío', () => {
    state({ isLoading: true });
    render(<WatchingCard />);
    expect(screen.getByLabelText('Cargando')).toBeTruthy();
    expect(screen.queryByText('No tenés nada en curso')).toBeNull();
  });

  it('sin nada en "Viendo" muestra el estado vacío', () => {
    state({});
    render(<WatchingCard />);
    expect(screen.getByText('No tenés nada en curso')).toBeTruthy();
  });

  it('el error se muestra con Reintentar y no se confunde con el vacío', () => {
    state({ error: new Error('x') });
    render(<WatchingCard />);
    expect(screen.getByText('No se pudo cargar tu lista')).toBeTruthy();
    expect(screen.queryByText('No tenés nada en curso')).toBeNull();
    fireEvent.press(screen.getByText('Reintentar'));
    expect(mockRetry).toHaveBeenCalledTimes(1);
  });
});
