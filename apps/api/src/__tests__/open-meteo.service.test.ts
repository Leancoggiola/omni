import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { conditionFromWmoCode, fetchWeather } from '../weather/open-meteo.service';

const fetchMock = vi.fn<typeof fetch>();
const COORDINATES = { latitude: -34.61, longitude: -58.38 };

function forecast(overrides: { temperature?: number; code?: number; isDay?: number } = {}) {
  return {
    current: {
      temperature_2m: overrides.temperature ?? 21.6,
      weather_code: overrides.code ?? 3,
      is_day: overrides.isDay ?? 1,
    },
    daily: { temperature_2m_max: [26.4], temperature_2m_min: [13.5] },
  };
}

describe('conditionFromWmoCode', () => {
  it.each([
    [0, 'clear'],
    [1, 'clear'],
    [2, 'partly-cloudy'],
    [3, 'cloudy'],
    [48, 'fog'],
    [55, 'drizzle'],
    [65, 'rain'],
    [81, 'rain'],
    [75, 'snow'],
    [86, 'snow'],
    [99, 'storm'],
  ])('mapea el código %i a %s', (code, condition) => {
    expect(conditionFromWmoCode(code)).toBe(condition);
  });

  it('devuelve null con un código que WMO no documenta', () => {
    expect(conditionFromWmoCode(42)).toBeNull();
  });
});

describe('fetchWeather', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('pide coordenadas, datos del día y la zona horaria de la app', async () => {
    fetchMock.mockResolvedValue(Response.json(forecast()));

    await fetchWeather(COORDINATES);

    const url = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect(url.pathname).toMatch(/\/forecast$/);
    expect(url.searchParams.get('latitude')).toBe('-34.61');
    expect(url.searchParams.get('longitude')).toBe('-58.38');
    expect(url.searchParams.get('timezone')).toBe('America/Argentina/Buenos_Aires');
    expect(url.searchParams.get('forecast_days')).toBe('1');
    expect(fetchMock.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
  });

  it('redondea las temperaturas y mapea la condición', async () => {
    fetchMock.mockResolvedValue(Response.json(forecast({ isDay: 0 })));

    await expect(fetchWeather(COORDINATES)).resolves.toEqual({
      temperature: 22,
      condition: 'cloudy',
      isDay: false,
      min: 14,
      max: 26,
    });
  });

  it('devuelve 502 cuando Open-Meteo responde con error', async () => {
    fetchMock.mockResolvedValue(new Response('boom', { status: 503 }));

    await expect(fetchWeather(COORDINATES)).rejects.toMatchObject({
      status: 502,
      message: 'Error de Open-Meteo: 503',
    });
  });

  it('devuelve 502 cuando no se puede contactar a Open-Meteo', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));

    await expect(fetchWeather(COORDINATES)).rejects.toMatchObject({
      status: 502,
      message: 'No se pudo contactar a Open-Meteo',
    });
  });

  it('devuelve 504 cuando el request vence', async () => {
    fetchMock.mockRejectedValue(new DOMException('timeout', 'TimeoutError'));

    await expect(fetchWeather(COORDINATES)).rejects.toMatchObject({
      status: 504,
      message: 'Open-Meteo no respondió a tiempo',
    });
  });

  it.each([
    ['el body no es JSON', () => new Response('<html></html>', { status: 200 })],
    ['falta un campo', () => Response.json({ current: {}, daily: {} })],
    ['el código WMO es desconocido', () => Response.json(forecast({ code: 42 }))],
  ])('devuelve 502 cuando %s', async (_case, buildResponse) => {
    fetchMock.mockResolvedValue(buildResponse());

    await expect(fetchWeather(COORDINATES)).rejects.toMatchObject({
      status: 502,
      message: 'Open-Meteo devolvió una respuesta inválida',
    });
  });
});
