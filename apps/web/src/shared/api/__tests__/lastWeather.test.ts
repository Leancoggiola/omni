import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { clearLastWeather, readLastWeather, saveLastWeather } from '../lastWeather';

import type { CurrentWeather } from '@omni/shared/weather';

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

describe('lastWeather', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-08T16:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('devuelve lo guardado como stale', () => {
    saveLastWeather('maria', WEATHER);
    expect(readLastWeather('maria')).toEqual({ ...WEATHER, stale: true });
  });

  it('guarda por persona', () => {
    saveLastWeather('maria', WEATHER);
    expect(readLastWeather('juan')).toBeNull();
  });

  it('descarta un dato que ya no sirve', () => {
    saveLastWeather('maria', WEATHER);
    vi.setSystemTime(new Date('2026-11-08T19:30:00.000Z'));
    expect(readLastWeather('maria')).toBeNull();
  });

  it('clearLastWeather borra solo el de esa persona', () => {
    saveLastWeather('maria', WEATHER);
    saveLastWeather('juan', WEATHER);
    clearLastWeather('maria');
    expect(readLastWeather('maria')).toBeNull();
    expect(readLastWeather('juan')).not.toBeNull();
  });

  it('si el storage falla al borrar no lanza', () => {
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    expect(() => clearLastWeather('maria')).not.toThrow();
    vi.restoreAllMocks();
  });

  it('si el storage falla devuelve null y no lanza', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    expect(readLastWeather('maria')).toBeNull();
    vi.restoreAllMocks();
  });
});
