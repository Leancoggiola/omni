import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../weather/open-meteo.service');

import * as openMeteoService from '../weather/open-meteo.service';
import { getCurrentWeather, resetWeatherCache } from '../weather/weather.service';

const mockedOpenMeteo = vi.mocked(openMeteoService);

const READING = { temperature: 22, condition: 'cloudy', isDay: true, min: 14, max: 26 } as const;
const START = new Date('2026-11-08T15:00:00.000Z');
const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

describe('weather.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetWeatherCache();
    vi.useFakeTimers();
    vi.setSystemTime(START);
    mockedOpenMeteo.fetchWeather.mockResolvedValue(READING);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('agrega la ciudad, la hora del dato y stale en false', async () => {
    await expect(getCurrentWeather()).resolves.toEqual({
      ...READING,
      city: 'Buenos Aires',
      updatedAt: START.toISOString(),
      stale: false,
    });
  });

  it('sirve desde caché antes de los 15 minutos', async () => {
    await getCurrentWeather();
    vi.advanceTimersByTime(14 * MINUTE);
    await getCurrentWeather();

    expect(mockedOpenMeteo.fetchWeather).toHaveBeenCalledTimes(1);
  });

  it('vuelve a consultar a los 15 minutos', async () => {
    await getCurrentWeather();
    vi.advanceTimersByTime(15 * MINUTE);
    await getCurrentWeather();

    expect(mockedOpenMeteo.fetchWeather).toHaveBeenCalledTimes(2);
  });

  it('deduplica las llamadas simultáneas', async () => {
    await Promise.all([getCurrentWeather(), getCurrentWeather(), getCurrentWeather()]);

    expect(mockedOpenMeteo.fetchWeather).toHaveBeenCalledTimes(1);
  });

  it('degrada al último dato guardado si el proveedor falla', async () => {
    await getCurrentWeather();
    vi.advanceTimersByTime(HOUR);
    mockedOpenMeteo.fetchWeather.mockRejectedValue({ status: 502, message: 'caído' });

    await expect(getCurrentWeather()).resolves.toMatchObject({
      temperature: 22,
      updatedAt: START.toISOString(),
      stale: true,
    });
  });

  it('propaga el error si el último dato pasó las 3 horas', async () => {
    await getCurrentWeather();
    vi.advanceTimersByTime(3 * HOUR + 1);
    mockedOpenMeteo.fetchWeather.mockRejectedValue({ status: 502, message: 'caído' });

    await expect(getCurrentWeather()).rejects.toMatchObject({ status: 502 });
  });

  it('propaga el error si no hay ningún dato guardado', async () => {
    mockedOpenMeteo.fetchWeather.mockRejectedValue({ status: 504, message: 'tarde' });

    await expect(getCurrentWeather()).rejects.toMatchObject({ status: 504 });
  });

  it('se recupera con datos frescos cuando el proveedor vuelve', async () => {
    await getCurrentWeather();
    vi.advanceTimersByTime(HOUR);
    mockedOpenMeteo.fetchWeather.mockRejectedValueOnce({ status: 502, message: 'caído' });
    await getCurrentWeather();

    await expect(getCurrentWeather()).resolves.toMatchObject({
      updatedAt: new Date(START.getTime() + HOUR).toISOString(),
      stale: false,
    });
  });
});
