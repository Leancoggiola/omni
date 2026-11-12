import { describe, expect, it } from 'vitest';

import {
  WEATHER_STALE_MAX_AGE_MS,
  canServeWeatherAsStale,
  formatTemperature,
  formatWeatherHeadline,
  formatWeatherRange,
  formatWeatherUpdatedAt,
  parseStoredWeather,
} from '..';

const NOW = new Date('2026-11-08T15:00:00.000Z');

const WEATHER = {
  city: 'Buenos Aires',
  temperature: 22,
  condition: 'cloudy',
  isDay: true,
  min: 14,
  max: 26,
  updatedAt: '2026-11-08T14:00:00.000Z',
  stale: false,
} as const;

describe('formatTemperature', () => {
  it('agrega el grado', () => {
    expect(formatTemperature(22)).toBe('22°');
    expect(formatTemperature(-3)).toBe('-3°');
  });

  it('no muestra el cero negativo', () => {
    expect(formatTemperature(-0)).toBe('0°');
  });
});

describe('formatWeatherRange', () => {
  it('muestra máxima y mínima', () => {
    expect(formatWeatherRange(14, 26)).toBe('Máx 26° · Mín 14°');
  });
});

describe('formatWeatherHeadline', () => {
  it('antepone la ciudad', () => {
    expect(formatWeatherHeadline('Rosario')).toBe('Rosario · Ahora');
  });

  it('sin ciudad queda solo "Ahora"', () => {
    expect(formatWeatherHeadline(null)).toBe('Ahora');
  });
});

describe('formatWeatherUpdatedAt', () => {
  it('muestra la hora en APP_TIMEZONE', () => {
    expect(formatWeatherUpdatedAt('2026-11-08T17:05:00.000Z')).toBe('14:05');
  });
});

describe('canServeWeatherAsStale', () => {
  it('sirve con menos de 3 horas y del mismo día', () => {
    expect(canServeWeatherAsStale(WEATHER, NOW)).toBe(true);
  });

  it('no sirve pasadas las 3 horas', () => {
    const updatedAt = new Date(NOW.getTime() - WEATHER_STALE_MAX_AGE_MS - 1).toISOString();
    expect(canServeWeatherAsStale({ ...WEATHER, updatedAt }, NOW)).toBe(false);
  });

  it('no sirve si es de otro día en APP_TIMEZONE', () => {
    const now = new Date('2026-11-08T04:00:00.000Z');
    expect(canServeWeatherAsStale({ ...WEATHER, updatedAt: '2026-11-08T02:30:00.000Z' }, now)).toBe(false);
  });
});

describe('parseStoredWeather', () => {
  it('devuelve el dato guardado marcado como stale', () => {
    expect(parseStoredWeather(JSON.stringify(WEATHER), NOW)).toEqual({ ...WEATHER, stale: true });
  });

  it('devuelve null sin dato, con JSON roto o con otro formato', () => {
    expect(parseStoredWeather(null, NOW)).toBeNull();
    expect(parseStoredWeather('{no es json', NOW)).toBeNull();
    expect(parseStoredWeather(JSON.stringify({ ...WEATHER, temperature: '22' }), NOW)).toBeNull();
  });

  it('descarta un dato vencido', () => {
    const old = { ...WEATHER, updatedAt: '2026-11-07T14:00:00.000Z' };
    expect(parseStoredWeather(JSON.stringify(old), NOW)).toBeNull();
  });
});
