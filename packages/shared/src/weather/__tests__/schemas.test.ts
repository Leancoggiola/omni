import { describe, expect, it } from 'vitest';

import {
  WEATHER_CONDITIONS,
  WEATHER_CONDITION_LABELS,
  currentWeatherQuerySchema,
  currentWeatherSchema,
  roundWeatherCoordinates,
} from '..';

const VALID = {
  city: 'Buenos Aires',
  temperature: 22,
  condition: 'cloudy',
  isDay: true,
  min: 14,
  max: 26,
  updatedAt: '2026-11-08T15:00:00.000Z',
  stale: false,
};

describe('currentWeatherSchema', () => {
  it('acepta el contrato completo', () => {
    expect(currentWeatherSchema.parse(VALID)).toEqual(VALID);
  });

  it('acepta una ciudad desconocida', () => {
    expect(currentWeatherSchema.safeParse({ ...VALID, city: null }).success).toBe(true);
  });

  it('acepta temperaturas bajo cero', () => {
    expect(currentWeatherSchema.safeParse({ ...VALID, temperature: -3, min: -8 }).success).toBe(true);
  });

  it('rechaza temperaturas con decimales', () => {
    expect(currentWeatherSchema.safeParse({ ...VALID, temperature: 22.5 }).success).toBe(false);
  });

  it('rechaza una condición desconocida', () => {
    expect(currentWeatherSchema.safeParse({ ...VALID, condition: 'hail' }).success).toBe(false);
  });

  it('rechaza una ciudad vacía', () => {
    expect(currentWeatherSchema.safeParse({ ...VALID, city: '' }).success).toBe(false);
  });
});

describe('currentWeatherQuerySchema', () => {
  it('convierte las coordenadas a números', () => {
    expect(currentWeatherQuerySchema.parse({ latitude: '-34.61', longitude: '-58.38' })).toEqual({
      latitude: -34.61,
      longitude: -58.38,
    });
  });

  it.each([
    ['falta la longitud', { latitude: '-34.61' }],
    ['la coordenada está vacía', { latitude: '', longitude: '-58.38' }],
    ['tiene más de dos decimales', { latitude: '-34.6037', longitude: '-58.38' }],
    ['la latitud se pasa de 90', { latitude: '90.01', longitude: '-58.38' }],
    ['la longitud se pasa de 180', { latitude: '-34.61', longitude: '180.5' }],
    ['no es un número', { latitude: 'abc', longitude: '-58.38' }],
    ['usa notación exponencial', { latitude: '1e1', longitude: '-58.38' }],
    ['manda un parámetro de más', { latitude: '-34.61', longitude: '-58.38', city: 'Rosario' }],
  ])('rechaza cuando %s', (_case, query) => {
    expect(currentWeatherQuerySchema.safeParse(query).success).toBe(false);
  });
});

describe('roundWeatherCoordinates', () => {
  it('deja dos decimales', () => {
    expect(roundWeatherCoordinates({ latitude: -34.603722, longitude: -58.381592 })).toEqual({
      latitude: -34.6,
      longitude: -58.38,
    });
  });

  it('produce valores que el query acepta', () => {
    const { latitude, longitude } = roundWeatherCoordinates({ latitude: 1.005, longitude: -179.999 });

    expect(
      currentWeatherQuerySchema.safeParse({ latitude: String(latitude), longitude: String(longitude) }).success
    ).toBe(true);
  });
});

describe('WEATHER_CONDITION_LABELS', () => {
  it('tiene un label para cada condición', () => {
    for (const condition of WEATHER_CONDITIONS) {
      expect(WEATHER_CONDITION_LABELS[condition]).toBeTruthy();
    }
  });
});
