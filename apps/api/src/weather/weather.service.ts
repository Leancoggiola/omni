import type { CurrentWeather, WeatherCoordinates } from '@omni/shared/weather';

import { logger } from '../common/utils';
import { fetchCityName } from './nominatim.service';
import { fetchWeather } from './open-meteo.service';

const CACHE_TTL_MS = 15 * 60 * 1000;
const MAX_STALE_AGE_MS = 3 * 60 * 60 * 1000;
const MAX_CACHED_LOCATIONS = 200;

const cache = new Map<string, CurrentWeather>();
const inFlight = new Map<string, Promise<CurrentWeather>>();

function ageMs(weather: CurrentWeather): number {
  return Date.now() - Date.parse(weather.updatedAt);
}

/** Guarda el dato como el más reciente y descarta el más viejo si se llenó el caché. */
function remember(key: string, weather: CurrentWeather): void {
  cache.delete(key);
  cache.set(key, weather);
  if (cache.size > MAX_CACHED_LOCATIONS) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
}

/**
 * Consulta al proveedor y guarda el resultado. El nombre de la ciudad se reutiliza del dato anterior para no volver a
 * pedírselo a Nominatim. Si el clima falla, degrada al último dato guardado marcado como `stale` mientras tenga menos
 * de 3 horas; más viejo ya no sirve como clima "ahora" y el error llega al cliente.
 */
async function refreshWeather(key: string, coordinates: WeatherCoordinates): Promise<CurrentWeather> {
  const previous = cache.get(key);
  try {
    const [reading, city] = await Promise.all([
      fetchWeather(coordinates),
      previous?.city ?? fetchCityName(coordinates),
    ]);
    const weather = { ...reading, city, updatedAt: new Date().toISOString(), stale: false };
    remember(key, weather);
    return weather;
  } catch (err) {
    if (previous && ageMs(previous) <= MAX_STALE_AGE_MS) {
      logger.warn({ err }, 'Open-Meteo falló: se devuelve el último clima guardado');
      return { ...previous, stale: true };
    }
    throw err;
  }
}

/**
 * Sirve el clima de unas coordenadas ya redondeadas desde un caché en memoria de 15 minutos, el intervalo con el que
 * Open-Meteo actualiza el dato actual. El caché tiene una entrada por posición y no se persiste: un reinicio de la API
 * lo vacía. Las llamadas simultáneas a la misma posición comparten una consulta y los errores no se cachean. Devuelve
 * temperaturas enteras en °C, con mín/máx del día en APP_TIMEZONE; `updatedAt` es cuándo la API obtuvo el dato.
 */
export async function getCurrentWeather(coordinates: WeatherCoordinates): Promise<CurrentWeather> {
  const key = `${coordinates.latitude},${coordinates.longitude}`;

  const cached = cache.get(key);
  if (cached && ageMs(cached) < CACHE_TTL_MS) return cached;

  const pending = inFlight.get(key);
  if (pending) return pending;

  const promise = refreshWeather(key, coordinates).finally(() => {
    inFlight.delete(key);
  });
  inFlight.set(key, promise);
  return promise;
}

/** Solo para tests: el caché es estado de módulo y sobrevive entre casos. */
export function resetWeatherCache(): void {
  cache.clear();
  inFlight.clear();
}
