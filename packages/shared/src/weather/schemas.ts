import { z } from 'zod';

import { WEATHER_CONDITIONS } from './constants';

/** Compara contra el valor redondeado porque multiplicar por 100 arrastra error de punto flotante. */
function hasAtMostTwoDecimals(value: number): boolean {
  return Number(value.toFixed(2)) === value;
}

/** Coordenada dentro de `±limit` y con hasta dos decimales: más precisión ubicaría a la persona. */
function coordinateSchema(limit: number) {
  return z.number().min(-limit).max(limit).refine(hasAtMostTwoDecimals, 'Coordenada con más de dos decimales');
}

export const currentWeatherBodySchema = z.strictObject({
  latitude: coordinateSchema(90),
  longitude: coordinateSchema(180),
});

export type WeatherCoordinates = z.infer<typeof currentWeatherBodySchema>;

export const currentWeatherSchema = z.object({
  city: z.string().min(1).nullable(),
  temperature: z.number().int(),
  condition: z.enum(WEATHER_CONDITIONS),
  isDay: z.boolean(),
  min: z.number().int(),
  max: z.number().int(),
  updatedAt: z.iso.datetime(),
  stale: z.boolean(),
});

export type CurrentWeather = z.infer<typeof currentWeatherSchema>;

/**
 * Redondea la posición del dispositivo a dos decimales (alrededor de 1 km) antes de mandarla a la API: alcanza para el
 * clima y la ciudad, y la ubicación exacta nunca sale del dispositivo.
 */
export function roundWeatherCoordinates({ latitude, longitude }: WeatherCoordinates): WeatherCoordinates {
  return {
    latitude: Math.round(latitude * 100) / 100,
    longitude: Math.round(longitude * 100) / 100,
  };
}
