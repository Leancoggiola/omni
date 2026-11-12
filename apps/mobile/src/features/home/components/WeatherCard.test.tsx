import { fireEvent, render, screen } from '@testing-library/react-native';
import { Linking } from 'react-native';

import { WeatherCard } from './WeatherCard';

import type { CurrentWeather } from '@omni/shared/weather';

const mockUseCurrentWeather = jest.fn();

jest.mock('tamagui', () => jest.requireActual('@/test/tamaguiMock'));
jest.mock('@/core/theme', () => ({
  ...jest.requireActual('@/test/themeMock'),
  useColorSchemeControl: () => ({ colorScheme: 'light' }),
}));
jest.mock('../hooks/useCurrentWeather', () => ({ useCurrentWeather: () => mockUseCurrentWeather() }));

const WEATHER: CurrentWeather = {
  city: 'Buenos Aires',
  temperature: 22,
  condition: 'cloudy',
  isDay: true,
  min: 14,
  max: 26,
  updatedAt: '2026-11-08T17:05:00.000Z',
  stale: false,
};

const mockRetry = jest.fn();
const mockRequestLocation = jest.fn();

const state = (value: Record<string, unknown>) =>
  mockUseCurrentWeather.mockReturnValue({
    weather: null,
    state: 'loading',
    error: undefined,
    retry: mockRetry,
    requestLocation: mockRequestLocation,
    canAskLocationAgain: true,
    ...value,
  });

beforeEach(() => {
  jest.clearAllMocks();
});

describe('WeatherCard', () => {
  it('muestra temperatura, condición, mínima y máxima y la ciudad', () => {
    state({ state: 'ready', weather: WEATHER });
    render(<WeatherCard />);
    expect(screen.getByText('Buenos Aires · Ahora')).toBeTruthy();
    expect(screen.getByText('Nublado')).toBeTruthy();
    expect(screen.getByText('22°')).toBeTruthy();
    expect(screen.getByText('Máx 26° · Mín 14°')).toBeTruthy();
  });

  it('sin ciudad muestra solo "Ahora"', () => {
    state({ state: 'ready', weather: { ...WEATHER, city: null } });
    render(<WeatherCard />);
    expect(screen.getByText('Ahora')).toBeTruthy();
  });

  it('el resumen se lee completo con un solo foco de accesibilidad', () => {
    state({ state: 'ready', weather: WEATHER });
    render(<WeatherCard />);
    expect(screen.getByLabelText('Clima. Buenos Aires · Ahora, Nublado, 22 grados. Máx 26° · Mín 14°')).toBeTruthy();
  });

  it('muestra la atribución y sus enlaces abren Open-Meteo y OpenStreetMap', () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    state({ state: 'ready', weather: WEATHER });
    render(<WeatherCard />);
    fireEvent.press(screen.getByRole('link', { name: 'Open-Meteo' }));
    fireEvent.press(screen.getByRole('link', { name: 'OpenStreetMap' }));
    expect(openURL).toHaveBeenNthCalledWith(1, 'https://open-meteo.com/');
    expect(openURL).toHaveBeenNthCalledWith(2, 'https://www.openstreetmap.org/copyright');
  });

  it('un dato fresco no avisa nada y uno stale dice a qué hora es', () => {
    state({ state: 'ready', weather: WEATHER });
    const { rerender } = render(<WeatherCard />);
    expect(screen.queryByText(/Sin datos nuevos/)).toBeNull();

    state({ state: 'ready', weather: { ...WEATHER, stale: true } });
    rerender(<WeatherCard />);
    expect(screen.getByText('Sin datos nuevos: último dato de las 14:05')).toBeTruthy();
  });

  it('mientras carga muestra el skeleton y no el contenido', () => {
    state({ state: 'loading' });
    render(<WeatherCard />);
    expect(screen.getByLabelText('Cargando')).toBeTruthy();
    expect(screen.queryByText(/Máx/)).toBeNull();
  });

  it('muestra el error y no un estado vacío, y reintenta', () => {
    state({ state: 'error' });
    render(<WeatherCard />);
    expect(screen.getByText('No se pudo cargar el clima')).toBeTruthy();
    expect(screen.queryByText('Activá la ubicación para ver el clima')).toBeNull();
    fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));
    expect(mockRetry).toHaveBeenCalledTimes(1);
  });

  it('sin ubicación invita a darla y vuelve a pedirla', () => {
    state({ state: 'no-location' });
    render(<WeatherCard />);
    expect(screen.getByText('Activá la ubicación para ver el clima')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Permitir ubicación' }));
    expect(mockRequestLocation).toHaveBeenCalledTimes(1);
  });

  it('si el sistema ya no deja preguntar ofrece abrir los ajustes', () => {
    state({ state: 'no-location', canAskLocationAgain: false });
    render(<WeatherCard />);
    expect(screen.queryByRole('button', { name: 'Permitir ubicación' })).toBeNull();
    fireEvent.press(screen.getByRole('button', { name: 'Abrir ajustes' }));
    expect(mockRequestLocation).toHaveBeenCalledTimes(1);
  });
});
