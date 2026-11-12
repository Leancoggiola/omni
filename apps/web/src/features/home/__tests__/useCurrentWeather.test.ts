import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useCurrentWeather } from '../hooks/useCurrentWeather';

import type { CurrentWeather } from '@omni/shared/weather';

import { WEATHER_REFRESH_MS } from '@omni/shared/weather';
import { renderHook } from '@testing-library/react';

const useSWR = vi.fn();
const mutate = vi.fn();
const useDeviceLocation = vi.fn();
const post = vi.fn();
const readLastWeather = vi.fn();
const saveLastWeather = vi.fn();
const auth: { user: { username: string } | null } = { user: { username: 'maria' } };

vi.mock('swr', () => ({ default: (...args: unknown[]) => useSWR(...args) }));
vi.mock('@/core/auth', () => ({ useAuth: () => ({ user: auth.user }) }));
vi.mock('@/shared/api', () => ({
  api: { post: (...args: unknown[]) => post(...args) },
  SWR_KEYS: { weather: { current: '/api/weather/current' } },
}));
vi.mock('../hooks/useDeviceLocation', () => ({ useDeviceLocation: () => useDeviceLocation() }));
vi.mock('../utils/lastWeather', () => ({
  readLastWeather: (...args: unknown[]) => readLastWeather(...args),
  saveLastWeather: (...args: unknown[]) => saveLastWeather(...args),
}));

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

const granted = {
  location: { status: 'granted', coordinates: { latitude: -34.6, longitude: -58.38 } },
  request: vi.fn(),
};

const swrState = (state: { data?: CurrentWeather; error?: unknown }) => ({
  data: undefined,
  error: undefined,
  mutate,
  ...state,
});

describe('useCurrentWeather', () => {
  beforeEach(() => {
    useSWR.mockReset();
    post.mockReset();
    readLastWeather.mockReset().mockReturnValue(null);
    saveLastWeather.mockReset();
    auth.user = { username: 'maria' };
    useDeviceLocation.mockReset().mockReturnValue(granted);
    useSWR.mockReturnValue(swrState({}));
  });

  it('sin permiso no llama a la API: la key es null y el estado "no-location"', () => {
    useDeviceLocation.mockReturnValue({ location: { status: 'unavailable', blocked: true }, request: vi.fn() });
    const { result } = renderHook(() => useCurrentWeather());
    expect(useSWR.mock.calls[0]?.[0]).toBeNull();
    expect(result.current.state).toBe('no-location');
    expect(result.current.locationBlocked).toBe(true);
  });

  it('mientras busca la posición está cargando y no llama a la API', () => {
    useDeviceLocation.mockReturnValue({ location: { status: 'locating' }, request: vi.fn() });
    const { result } = renderHook(() => useCurrentWeather());
    expect(useSWR.mock.calls[0]?.[0]).toBeNull();
    expect(result.current.state).toBe('loading');
  });

  it('la key lleva las coordenadas y el fetcher las manda en el body, no en la URL', async () => {
    renderHook(() => useCurrentWeather());
    const [key, fetcher, options] = useSWR.mock.calls[0] ?? [];
    expect(key).toEqual(['/api/weather/current', -34.6, -58.38]);
    await fetcher(key);
    expect(post).toHaveBeenCalledWith('/api/weather/current', { latitude: -34.6, longitude: -58.38 });
    expect(options).toMatchObject({ refreshInterval: WEATHER_REFRESH_MS });
  });

  it('con datos está "ready" y los guarda como respaldo', () => {
    useSWR.mockReturnValue(swrState({ data: WEATHER }));
    const { result } = renderHook(() => useCurrentWeather());
    expect(result.current.state).toBe('ready');
    expect(result.current.weather).toEqual(WEATHER);
    expect(saveLastWeather).toHaveBeenCalledWith('maria', WEATHER);
  });

  it('si la API falla y hay un dato guardado, lo muestra', () => {
    const saved = { ...WEATHER, stale: true };
    readLastWeather.mockReturnValue(saved);
    useSWR.mockReturnValue(swrState({ error: new Error('x') }));
    const { result } = renderHook(() => useCurrentWeather());
    expect(result.current.state).toBe('ready');
    expect(result.current.weather).toEqual(saved);
  });

  it('si el usuario llega después del montaje, igual usa el respaldo guardado', () => {
    const saved = { ...WEATHER, stale: true };
    auth.user = null;
    readLastWeather.mockImplementation((username: string) => (username === 'maria' ? saved : null));
    useSWR.mockReturnValue(swrState({ error: new Error('x') }));
    const { result, rerender } = renderHook(() => useCurrentWeather());
    expect(result.current.state).toBe('error');

    auth.user = { username: 'maria' };
    rerender();

    expect(result.current.state).toBe('ready');
    expect(result.current.weather).toEqual(saved);
  });

  it('si la API falla y no hay respaldo, es un error', () => {
    useSWR.mockReturnValue(swrState({ error: new Error('x') }));
    const { result } = renderHook(() => useCurrentWeather());
    expect(result.current.state).toBe('error');
    expect(result.current.weather).toBeNull();
  });

  it('un dato de la API gana sobre el respaldo aunque haya un error de revalidación', () => {
    readLastWeather.mockReturnValue({ ...WEATHER, temperature: 1, stale: true });
    useSWR.mockReturnValue(swrState({ data: WEATHER, error: new Error('x') }));
    const { result } = renderHook(() => useCurrentWeather());
    expect(result.current.weather).toEqual(WEATHER);
  });
});
