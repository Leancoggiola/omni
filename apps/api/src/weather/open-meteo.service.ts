import { z } from 'zod';

import { APP_TIMEZONE } from '@omni/shared/common';
import type { CurrentWeather, WeatherCondition } from '@omni/shared/weather';

import { HttpError } from '../common/http';
import { config } from '../config';

const REQUEST_TIMEOUT_MS = 5_000;

export interface WeatherCoordinates {
  latitude: number;
  longitude: number;
}

export type WeatherReading = Pick<CurrentWeather, 'temperature' | 'condition' | 'isDay' | 'min' | 'max'>;

/** Agrupa los códigos WMO que documenta Open-Meteo en las condiciones que muestran los clientes. */
export function conditionFromWmoCode(code: number): WeatherCondition | null {
  if (code === 0 || code === 1) return 'clear';
  if (code === 2) return 'partly-cloudy';
  if (code === 3) return 'cloudy';
  if (code === 45 || code === 48) return 'fog';
  if ([51, 53, 55, 56, 57].includes(code)) return 'drizzle';
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'rain';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'snow';
  if ([95, 96, 99].includes(code)) return 'storm';
  return null;
}

const weatherConditionSchema = z
  .number()
  .int()
  .transform((code, ctx) => {
    const condition = conditionFromWmoCode(code);
    if (!condition) {
      ctx.addIssue({ code: 'custom', message: `Código WMO desconocido: ${code}` });
      return z.NEVER;
    }
    return condition;
  });

const openMeteoResponseSchema = z.object({
  current: z.object({
    temperature_2m: z.number(),
    weather_code: weatherConditionSchema,
    is_day: z.union([z.literal(0), z.literal(1)]),
  }),
  daily: z.object({
    temperature_2m_max: z.tuple([z.number()]),
    temperature_2m_min: z.tuple([z.number()]),
  }),
});

/** Traduce una falla de red o de lectura del body al error HTTP que expone la API. */
function upstreamError(err: unknown, fallbackMessage: string): HttpError {
  if (err instanceof Error && err.name === 'TimeoutError') {
    return new HttpError(504, 'Open-Meteo no respondió a tiempo');
  }
  return new HttpError(502, fallbackMessage);
}

/**
 * Pide el clima actual y el rango del día en APP_TIMEZONE. La respuesta es externa, así que se valida antes de
 * mapearla: un dato incompleto o un código WMO desconocido cuentan como respuesta inválida.
 */
export async function fetchWeather({ latitude, longitude }: WeatherCoordinates): Promise<WeatherReading> {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: 'temperature_2m,weather_code,is_day',
    daily: 'temperature_2m_max,temperature_2m_min',
    timezone: APP_TIMEZONE,
    forecast_days: '1',
  });

  let res: Response;
  try {
    res = await fetch(`${config.openMeteo.baseUrl}/forecast?${params}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (err) {
    throw upstreamError(err, 'No se pudo contactar a Open-Meteo');
  }

  if (!res.ok) {
    throw new HttpError(502, `Error de Open-Meteo: ${res.status}`);
  }

  let body: unknown;
  try {
    body = await res.json();
  } catch (err) {
    throw upstreamError(err, 'Open-Meteo devolvió una respuesta inválida');
  }

  const parsed = openMeteoResponseSchema.safeParse(body);
  if (!parsed.success) {
    throw new HttpError(502, 'Open-Meteo devolvió una respuesta inválida');
  }

  const { current, daily } = parsed.data;
  return {
    temperature: Math.round(current.temperature_2m),
    condition: current.weather_code,
    isDay: current.is_day === 1,
    min: Math.round(daily.temperature_2m_min[0]),
    max: Math.round(daily.temperature_2m_max[0]),
  };
}
