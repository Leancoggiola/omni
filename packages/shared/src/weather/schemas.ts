import { z } from 'zod';

import { WEATHER_CONDITIONS } from './constants';

export const currentWeatherQuerySchema = z.strictObject({});

export const currentWeatherSchema = z.object({
  city: z.string().min(1),
  temperature: z.number().int(),
  condition: z.enum(WEATHER_CONDITIONS),
  isDay: z.boolean(),
  min: z.number().int(),
  max: z.number().int(),
  updatedAt: z.iso.datetime(),
  stale: z.boolean(),
});

export type CurrentWeather = z.infer<typeof currentWeatherSchema>;
