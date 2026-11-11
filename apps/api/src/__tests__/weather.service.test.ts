import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../weather/open-meteo.service');
vi.mock('../weather/nominatim.service');

import * as nominatimService from '../weather/nominatim.service';
import * as openMeteoService from '../weather/open-meteo.service';
import { getCurrentWeather, resetWeatherCache } from '../weather/weather.service';

const mockedOpenMeteo = vi.mocked(openMeteoService);
const mockedNominatim = vi.mocked(nominatimService);

const READING = { temperature: 22, condition: 'cloudy', isDay: true, min: 14, max: 26 } as const;
const START = new Date('2026-11-08T15:00:00.000Z');
const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const BUENOS_AIRES = { latitude: -34.61, longitude: -58.38 };
const ROSARIO = { latitude: -32.95, longitude: -60.64 };

describe('weather.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetWeatherCache();
    vi.useFakeTimers();
    vi.setSystemTime(START);
    mockedOpenMeteo.fetchWeather.mockResolvedValue(READING);
    mockedNominatim.fetchCityName.mockResolvedValue('Buenos Aires');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('agrega la ciudad, la hora del dato y stale en false', async () => {
    await expect(getCurrentWeather(BUENOS_AIRES)).resolves.toEqual({
      ...READING,
      city: 'Buenos Aires',
      updatedAt: START.toISOString(),
      stale: false,
    });
    expect(mockedOpenMeteo.fetchWeather).toHaveBeenCalledWith(BUENOS_AIRES);
  });

  it('devuelve el clima aunque no se conozca la ciudad', async () => {
    mockedNominatim.fetchCityName.mockResolvedValue(null);

    await expect(getCurrentWeather(BUENOS_AIRES)).resolves.toMatchObject({ temperature: 22, city: null });
  });

  it('sirve desde caché antes de los 15 minutos', async () => {
    await getCurrentWeather(BUENOS_AIRES);
    vi.advanceTimersByTime(14 * MINUTE);
    await getCurrentWeather(BUENOS_AIRES);

    expect(mockedOpenMeteo.fetchWeather).toHaveBeenCalledTimes(1);
  });

  it('vuelve a consultar a los 15 minutos sin pedir de nuevo la ciudad', async () => {
    await getCurrentWeather(BUENOS_AIRES);
    vi.advanceTimersByTime(15 * MINUTE);
    await getCurrentWeather(BUENOS_AIRES);

    expect(mockedOpenMeteo.fetchWeather).toHaveBeenCalledTimes(2);
    expect(mockedNominatim.fetchCityName).toHaveBeenCalledTimes(1);
  });

  it('reintenta la ciudad si la consulta anterior no la resolvió', async () => {
    mockedNominatim.fetchCityName.mockResolvedValueOnce(null);
    await getCurrentWeather(BUENOS_AIRES);
    vi.advanceTimersByTime(15 * MINUTE);

    await expect(getCurrentWeather(BUENOS_AIRES)).resolves.toMatchObject({ city: 'Buenos Aires' });
  });

  it('cachea cada posición por separado', async () => {
    await getCurrentWeather(BUENOS_AIRES);
    await getCurrentWeather(ROSARIO);
    await getCurrentWeather(BUENOS_AIRES);

    expect(mockedOpenMeteo.fetchWeather).toHaveBeenCalledTimes(2);
    expect(mockedOpenMeteo.fetchWeather).toHaveBeenCalledWith(ROSARIO);
  });

  it('descarta la posición más vieja al llenarse el caché', async () => {
    await getCurrentWeather(BUENOS_AIRES);
    for (let index = 0; index < 200; index += 1) {
      await getCurrentWeather({ latitude: index / 100, longitude: 10 });
    }
    mockedOpenMeteo.fetchWeather.mockClear();

    await getCurrentWeather(BUENOS_AIRES);

    expect(mockedOpenMeteo.fetchWeather).toHaveBeenCalledTimes(1);
  });

  it('deduplica las llamadas simultáneas a la misma posición', async () => {
    await Promise.all([
      getCurrentWeather(BUENOS_AIRES),
      getCurrentWeather(BUENOS_AIRES),
      getCurrentWeather(BUENOS_AIRES),
    ]);

    expect(mockedOpenMeteo.fetchWeather).toHaveBeenCalledTimes(1);
  });

  it('comparte la falla entre simultáneas y reintenta en la llamada siguiente', async () => {
    mockedOpenMeteo.fetchWeather.mockRejectedValueOnce({ status: 502, message: 'caído' });

    const results = await Promise.allSettled([getCurrentWeather(BUENOS_AIRES), getCurrentWeather(BUENOS_AIRES)]);

    expect(results.map(result => result.status)).toEqual(['rejected', 'rejected']);
    expect(mockedOpenMeteo.fetchWeather).toHaveBeenCalledTimes(1);
    await expect(getCurrentWeather(BUENOS_AIRES)).resolves.toMatchObject({ stale: false });
  });

  it('no consulta la ciudad si el clima falla', async () => {
    mockedOpenMeteo.fetchWeather.mockRejectedValue({ status: 502, message: 'caído' });

    await expect(getCurrentWeather(BUENOS_AIRES)).rejects.toMatchObject({ status: 502 });
    expect(mockedNominatim.fetchCityName).not.toHaveBeenCalled();
  });

  it('degrada al último dato guardado si el proveedor falla', async () => {
    await getCurrentWeather(BUENOS_AIRES);
    vi.advanceTimersByTime(HOUR);
    mockedOpenMeteo.fetchWeather.mockRejectedValue({ status: 502, message: 'caído' });

    await expect(getCurrentWeather(BUENOS_AIRES)).resolves.toMatchObject({
      temperature: 22,
      updatedAt: START.toISOString(),
      stale: true,
    });
  });

  it('no degrada con el dato de otra posición', async () => {
    await getCurrentWeather(BUENOS_AIRES);
    mockedOpenMeteo.fetchWeather.mockRejectedValue({ status: 502, message: 'caído' });

    await expect(getCurrentWeather(ROSARIO)).rejects.toMatchObject({ status: 502 });
  });

  it('propaga el error si el último dato pasó las 3 horas', async () => {
    await getCurrentWeather(BUENOS_AIRES);
    vi.advanceTimersByTime(3 * HOUR + 1);
    mockedOpenMeteo.fetchWeather.mockRejectedValue({ status: 502, message: 'caído' });

    await expect(getCurrentWeather(BUENOS_AIRES)).rejects.toMatchObject({ status: 502 });
  });

  it('propaga el error si no hay ningún dato guardado', async () => {
    mockedOpenMeteo.fetchWeather.mockRejectedValue({ status: 504, message: 'tarde' });

    await expect(getCurrentWeather(BUENOS_AIRES)).rejects.toMatchObject({ status: 504 });
  });

  it('se recupera con datos frescos cuando el proveedor vuelve', async () => {
    await getCurrentWeather(BUENOS_AIRES);
    vi.advanceTimersByTime(HOUR);
    mockedOpenMeteo.fetchWeather.mockRejectedValueOnce({ status: 502, message: 'caído' });
    await getCurrentWeather(BUENOS_AIRES);
    vi.advanceTimersByTime(MINUTE);

    await expect(getCurrentWeather(BUENOS_AIRES)).resolves.toMatchObject({
      updatedAt: new Date(START.getTime() + HOUR + MINUTE).toISOString(),
      stale: false,
    });
  });

  it('no reintenta durante un minuto después de una falla', async () => {
    await getCurrentWeather(BUENOS_AIRES);
    vi.advanceTimersByTime(HOUR);
    mockedOpenMeteo.fetchWeather.mockRejectedValue({ status: 502, message: 'caído' });
    await getCurrentWeather(BUENOS_AIRES);
    mockedOpenMeteo.fetchWeather.mockClear();

    vi.advanceTimersByTime(MINUTE - 1);
    await expect(getCurrentWeather(BUENOS_AIRES)).resolves.toMatchObject({ stale: true });
    expect(mockedOpenMeteo.fetchWeather).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    await expect(getCurrentWeather(BUENOS_AIRES)).resolves.toMatchObject({ stale: true });
    expect(mockedOpenMeteo.fetchWeather).toHaveBeenCalledTimes(1);
  });

  it('no degrada con el mín/máx de otro día en APP_TIMEZONE', async () => {
    vi.setSystemTime(new Date('2026-11-09T02:30:00.000Z'));
    await getCurrentWeather(BUENOS_AIRES);
    vi.advanceTimersByTime(HOUR);
    mockedOpenMeteo.fetchWeather.mockRejectedValue({ status: 502, message: 'caído' });

    await expect(getCurrentWeather(BUENOS_AIRES)).rejects.toMatchObject({ status: 502 });
  });
});
