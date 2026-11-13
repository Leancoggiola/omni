import { renderHook, waitFor } from '@testing-library/react-native';

import { useCurrentWeather } from './useCurrentWeather';

import type { CurrentWeather } from '@omni/shared/weather';

import { WEATHER_REFRESH_MS } from '@omni/shared/weather';

const mockUseSWR = jest.fn();
const mockMutate = jest.fn();
const mockUseDeviceLocation = jest.fn();
const mockPost = jest.fn();
const mockReadLastWeather = jest.fn();
const mockSaveLastWeather = jest.fn();
const mockIsFocused = jest.fn();

jest.mock('swr', () => ({ __esModule: true, default: (...args: unknown[]) => mockUseSWR(...args) }));
jest.mock('expo-router/react-navigation', () => ({ useIsFocused: () => mockIsFocused() }));
jest.mock('@/core/auth', () => ({ useAuth: () => ({ user: { username: 'maria' } }) }));
jest.mock('@/shared/api', () => ({
  api: { post: (...args: unknown[]) => mockPost(...args) },
  API_KEYS: { weather: { current: '/api/weather/current' } },
  readLastWeather: (...args: unknown[]) => mockReadLastWeather(...args),
  saveLastWeather: (...args: unknown[]) => mockSaveLastWeather(...args),
}));
jest.mock('./useDeviceLocation', () => ({ useDeviceLocation: () => mockUseDeviceLocation() }));

const WEATHER: CurrentWeather = {
  city: 'Rosario',
  temperature: 20,
  condition: 'clear',
  isDay: true,
  min: 12,
  max: 24,
  updatedAt: '2026-11-08T15:00:00.000Z',
  stale: false,
};

const GRANTED = {
  location: { status: 'granted', coordinates: { latitude: -34.6, longitude: -58.38 } },
  request: jest.fn(),
};

const swrState = (state: { data?: CurrentWeather; error?: unknown }) => ({
  data: undefined,
  error: undefined,
  mutate: mockMutate,
  ...state,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockIsFocused.mockReturnValue(true);
  mockReadLastWeather.mockResolvedValue(null);
  mockUseDeviceLocation.mockReturnValue(GRANTED);
  mockUseSWR.mockReturnValue(swrState({}));
});

describe('useCurrentWeather', () => {
  it('sin permiso no llama a la API: la key es null y el estado "no-location"', () => {
    mockUseDeviceLocation.mockReturnValue({
      location: { status: 'unavailable', canAskAgain: true },
      request: jest.fn(),
    });
    const { result } = renderHook(() => useCurrentWeather());
    expect(mockUseSWR.mock.calls[0]?.[0]).toBeNull();
    expect(result.current.state).toBe('no-location');
    expect(result.current.canAskLocationAgain).toBe(true);
  });

  it('avisa si el sistema ya no deja preguntar el permiso', () => {
    mockUseDeviceLocation.mockReturnValue({
      location: { status: 'unavailable', canAskAgain: false },
      request: jest.fn(),
    });
    const { result } = renderHook(() => useCurrentWeather());
    expect(result.current.canAskLocationAgain).toBe(false);
  });

  it('mientras busca la posición está cargando y no llama a la API', () => {
    mockUseDeviceLocation.mockReturnValue({ location: { status: 'locating' }, request: jest.fn() });
    const { result } = renderHook(() => useCurrentWeather());
    expect(mockUseSWR.mock.calls[0]?.[0]).toBeNull();
    expect(result.current.state).toBe('loading');
  });

  it('la key lleva las coordenadas y el fetcher las manda en el body, no en la URL', async () => {
    renderHook(() => useCurrentWeather());
    const [key, fetcher, options] = mockUseSWR.mock.calls[0] ?? [];
    expect(key).toEqual(['/api/weather/current', -34.6, -58.38]);
    await fetcher(key);
    expect(mockPost).toHaveBeenCalledWith('/api/weather/current', { latitude: -34.6, longitude: -58.38 });
    expect(options).toMatchObject({ refreshInterval: WEATHER_REFRESH_MS });
  });

  it('con la pantalla fuera de foco no se refresca', () => {
    mockIsFocused.mockReturnValue(false);
    renderHook(() => useCurrentWeather());
    expect(mockUseSWR.mock.calls[0]?.[2]).toMatchObject({ refreshInterval: 0 });
  });

  it('con datos está "ready" y los guarda como respaldo', async () => {
    mockUseSWR.mockReturnValue(swrState({ data: WEATHER }));
    const { result } = renderHook(() => useCurrentWeather());
    expect(result.current.state).toBe('ready');
    expect(result.current.weather).toEqual(WEATHER);
    await waitFor(() => expect(mockSaveLastWeather).toHaveBeenCalledWith('maria', WEATHER));
  });

  it('si la API falla y hay un dato guardado, lo muestra', async () => {
    const saved = { ...WEATHER, stale: true };
    mockReadLastWeather.mockResolvedValue(saved);
    mockUseSWR.mockReturnValue(swrState({ error: new Error('x') }));
    const { result } = renderHook(() => useCurrentWeather());
    await waitFor(() => expect(result.current.state).toBe('ready'));
    expect(result.current.weather).toEqual(saved);
  });

  it('si la API falla y no hay respaldo, es un error', () => {
    mockUseSWR.mockReturnValue(swrState({ error: new Error('x') }));
    const { result } = renderHook(() => useCurrentWeather());
    expect(result.current.state).toBe('error');
    expect(result.current.weather).toBeNull();
  });
});
