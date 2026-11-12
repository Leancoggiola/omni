import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/__tests__/helpers';

import { WeatherCard } from '../components/WeatherCard';

import type { CurrentWeather } from '@omni/shared/weather';

import { fireEvent, screen } from '@testing-library/react';

const useCurrentWeather = vi.fn();

vi.mock('../hooks/useCurrentWeather', () => ({
  useCurrentWeather: () => useCurrentWeather(),
}));

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

const withState = (state: string, weather: CurrentWeather | null = null, locationBlocked = false) => {
  const retry = vi.fn();
  const requestLocation = vi.fn();
  useCurrentWeather.mockReturnValue({ weather, state, error: undefined, retry, requestLocation, locationBlocked });
  return { retry, requestLocation };
};

describe('WeatherCard', () => {
  beforeEach(() => {
    useCurrentWeather.mockReset();
  });

  it('muestra temperatura, condición, mínima y máxima y la ciudad', () => {
    withState('ready', WEATHER);
    renderWithProviders(<WeatherCard />);
    expect(screen.getByText('Buenos Aires · Ahora')).toBeInTheDocument();
    expect(screen.getByText('Nublado')).toBeInTheDocument();
    expect(screen.getByText('22°')).toBeInTheDocument();
    expect(screen.getByText('Máx 26° · Mín 14°')).toBeInTheDocument();
  });

  it('sin ciudad muestra solo "Ahora"', () => {
    withState('ready', { ...WEATHER, city: null });
    renderWithProviders(<WeatherCard />);
    expect(screen.getByText('Ahora')).toBeInTheDocument();
    expect(screen.queryByText(/·\s*Ahora/)).not.toBeInTheDocument();
  });

  it('muestra la atribución de Open-Meteo y OpenStreetMap con sus enlaces', () => {
    withState('ready', WEATHER);
    renderWithProviders(<WeatherCard />);
    expect(screen.getByRole('link', { name: 'Open-Meteo' })).toHaveAttribute('href', 'https://open-meteo.com/');
    expect(screen.getByRole('link', { name: 'OpenStreetMap' })).toHaveAttribute(
      'href',
      'https://www.openstreetmap.org/copyright'
    );
  });

  it('un dato fresco no avisa nada', () => {
    withState('ready', WEATHER);
    renderWithProviders(<WeatherCard />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('un dato stale avisa a qué hora es', () => {
    withState('ready', { ...WEATHER, stale: true });
    renderWithProviders(<WeatherCard />);
    expect(screen.getByRole('status')).toHaveTextContent('último dato de las 14:05');
  });

  it('mientras carga muestra el skeleton y no el contenido', () => {
    withState('loading');
    renderWithProviders(<WeatherCard />);
    expect(screen.getByRole('status', { name: 'Cargando' })).toBeInTheDocument();
    expect(screen.queryByText('Máx', { exact: false })).not.toBeInTheDocument();
  });

  it('muestra el error y no un estado vacío, y reintenta', () => {
    const { retry } = withState('error');
    renderWithProviders(<WeatherCard />);
    expect(screen.getByText('No se pudo cargar el clima')).toBeInTheDocument();
    expect(screen.queryByText('Activá la ubicación para ver el clima')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it('sin ubicación invita a darla y vuelve a pedirla', () => {
    const { requestLocation } = withState('no-location');
    renderWithProviders(<WeatherCard />);
    expect(screen.getByText('Activá la ubicación para ver el clima')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Permitir ubicación' }));
    expect(requestLocation).toHaveBeenCalledOnce();
  });

  it('con la ubicación bloqueada en el navegador explica cómo habilitarla', () => {
    withState('no-location', null, true);
    renderWithProviders(<WeatherCard />);
    expect(screen.getByText(/candado de la barra de direcciones/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Permitir ubicación' })).toBeInTheDocument();
  });
});
