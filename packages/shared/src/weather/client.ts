import { APP_TIMEZONE, appDateKey } from '../common/dates';
import { currentWeatherSchema } from './schemas';

import type { CurrentWeather } from './schemas';

/** Cada cuánto el cliente vuelve a pedir el clima: el caché de la API vive 15 minutos, así que antes no cambia. */
export const WEATHER_REFRESH_MS = 15 * 60 * 1000;

/** Hasta cuánto un dato guardado (en la API o en el cliente) sirve como respaldo si el proveedor falla. */
export const WEATHER_STALE_MAX_AGE_MS = 3 * 60 * 60 * 1000;

/** Open-Meteo pide CC-BY 4.0 y Nominatim la atribución de OpenStreetMap (ODbL): la UI tiene que mostrar las dos. */
export const WEATHER_ATTRIBUTION = 'Datos: Open-Meteo · © OpenStreetMap';

/** Temperatura entera con el símbolo de grado: `22°`. */
export function formatTemperature(value: number): string {
  return `${value === 0 ? 0 : value}°`;
}

/** Mínima y máxima del día como las muestra el widget: `Máx 26° · Mín 14°`. */
export function formatWeatherRange(min: number, max: number): string {
  return `Máx ${formatTemperature(max)} · Mín ${formatTemperature(min)}`;
}

/** Encabezado de la card: `Buenos Aires · Ahora`, o solo `Ahora` si el punto no tiene nombre de localidad. */
export function formatWeatherHeadline(city: string | null): string {
  return city ? `${city} · Ahora` : 'Ahora';
}

/** Hora a la que la API obtuvo el dato, en APP_TIMEZONE y de 24 horas: `14:05`. */
export function formatWeatherUpdatedAt(updatedAt: string): string {
  return new Intl.DateTimeFormat('es-AR', {
    timeZone: APP_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(updatedAt));
}

/** Un dato sirve como respaldo si tiene menos de 3 horas y es de hoy: el mín/máx de ayer ya no describe el día. */
export function canServeWeatherAsStale(weather: CurrentWeather, now = new Date()): boolean {
  const updatedAt = new Date(weather.updatedAt);
  return now.getTime() - updatedAt.getTime() <= WEATHER_STALE_MAX_AGE_MS && appDateKey(updatedAt) === appDateKey(now);
}

/**
 * Lee el último clima que guardó el cliente. Devuelve `null` si no hay nada, si el JSON no es el contrato o si ya no
 * sirve como respaldo; si sirve, lo marca `stale` porque ya no es lo que contestó la API en esta carga.
 */
export function parseStoredWeather(raw: string | null, now = new Date()): CurrentWeather | null {
  if (!raw) return null;
  try {
    const parsed = currentWeatherSchema.safeParse(JSON.parse(raw));
    if (!parsed.success || !canServeWeatherAsStale(parsed.data, now)) return null;
    return { ...parsed.data, stale: true };
  } catch {
    return null;
  }
}
