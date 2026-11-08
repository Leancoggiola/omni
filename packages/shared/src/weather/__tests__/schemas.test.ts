import { describe, expect, it } from 'vitest';

import { WEATHER_CONDITIONS, WEATHER_CONDITION_LABELS, currentWeatherQuerySchema, currentWeatherSchema } from '..';

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
  it('acepta un query vacío', () => {
    expect(currentWeatherQuerySchema.safeParse({}).success).toBe(true);
  });

  it('rechaza coordenadas', () => {
    expect(currentWeatherQuerySchema.safeParse({ lat: '-34.6', lon: '-58.3' }).success).toBe(false);
  });
});

describe('WEATHER_CONDITION_LABELS', () => {
  it('tiene un label para cada condición', () => {
    for (const condition of WEATHER_CONDITIONS) {
      expect(WEATHER_CONDITION_LABELS[condition]).toBeTruthy();
    }
  });
});
