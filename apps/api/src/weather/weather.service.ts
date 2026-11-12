import { canServeWeatherAsStale } from '@omni/shared/weather';
import type { CurrentWeather, WeatherCoordinates } from '@omni/shared/weather';

import { logger } from '../common/utils';
import { fetchCityName } from './nominatim.service';
import { fetchWeather } from './open-meteo.service';

const CACHE_TTL_MS = 15 * 60 * 1000;
const RETRY_AFTER_FAILURE_MS = 60 * 1000;
const MAX_CACHED_LOCATIONS = 200;

interface CacheEntry {
  weather: CurrentWeather;
  refreshAt: number;
}

const cache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<CurrentWeather>>();

/** Guarda el dato como el más reciente y descarta el más viejo si se llenó el caché. */
function remember(key: string, weather: CurrentWeather): void {
  cache.delete(key);
  cache.set(key, { weather, refreshAt: Date.now() + CACHE_TTL_MS });
  if (cache.size > MAX_CACHED_LOCATIONS) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
}

/**
 * Consulta al proveedor y guarda el resultado. La ciudad se pide después del clima para no gastar una consulta a
 * Nominatim si Open-Meteo falla, y se reutiliza del dato anterior. Si el clima falla y el último dato todavía sirve,
 * lo devuelve marcado como `stale` y no reintenta durante un minuto, para que cada request no espere el timeout
 * mientras dure la caída.
 */
async function refreshWeather(key: string, coordinates: WeatherCoordinates): Promise<CurrentWeather> {
  const previous = cache.get(key)?.weather;
  try {
    const reading = await fetchWeather(coordinates);
    const city = previous?.city ?? (await fetchCityName(coordinates));
    const weather = { ...reading, city, updatedAt: new Date().toISOString(), stale: false };
    remember(key, weather);
    return weather;
  } catch (err) {
    if (previous && canServeWeatherAsStale(previous)) {
      logger.warn({ err }, 'Open-Meteo falló: se devuelve el último clima guardado');
      const weather = { ...previous, stale: true };
      cache.delete(key);
      cache.set(key, { weather, refreshAt: Date.now() + RETRY_AFTER_FAILURE_MS });
      return weather;
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
  if (cached && Date.now() < cached.refreshAt) return cached.weather;

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
