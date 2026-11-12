import { describe, expect, it } from 'vitest';

import { getWeatherIcon } from '../utils/weatherIcons';

import { WEATHER_CONDITIONS } from '@omni/shared/weather';

describe('getWeatherIcon', () => {
  it('tiene un ícono para cada condición, de día y de noche', () => {
    for (const condition of WEATHER_CONDITIONS) {
      expect(getWeatherIcon(condition, true)).toBeDefined();
      expect(getWeatherIcon(condition, false)).toBeDefined();
    }
  });

  it('de noche el despejado y el parcialmente nublado cambian de ícono', () => {
    expect(getWeatherIcon('clear', false)).not.toBe(getWeatherIcon('clear', true));
    expect(getWeatherIcon('partly-cloudy', false)).not.toBe(getWeatherIcon('partly-cloudy', true));
  });

  it('el resto de las condiciones no cambia de noche', () => {
    expect(getWeatherIcon('rain', false)).toBe(getWeatherIcon('rain', true));
  });
});
