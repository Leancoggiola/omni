import { z } from 'zod';

import { WEATHER_CONDITIONS } from './constants';

const COORDINATE_PATTERN = /^-?\d{1,3}(\.\d{1,2})?$/;

/** Coordenada en texto con hasta dos decimales, dentro de `±limit`: más precisión ubicaría a la persona. */
function coordinateSchema(limit: number) {
  return z
    .string()
    .regex(COORDINATE_PATTERN, 'Coordenada inválida')
    .transform(Number)
    .pipe(z.number().min(-limit).max(limit));
}

export const currentWeatherQuerySchema = z.strictObject({
  latitude: coordinateSchema(90),
  longitude: coordinateSchema(180),
});

export type WeatherCoordinates = z.infer<typeof currentWeatherQuerySchema>;

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
