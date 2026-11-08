import type { CurrentWeather } from '@omni/shared/weather';

import { logger } from '../common/utils';
import { config } from '../config';
import { fetchWeather } from './open-meteo.service';

const CACHE_TTL_MS = 15 * 60 * 1000;
const MAX_STALE_AGE_MS = 3 * 60 * 60 * 1000;

let cache: CurrentWeather | null = null;
let inFlight: Promise<CurrentWeather> | null = null;

function ageMs(weather: CurrentWeather): number {
  return Date.now() - Date.parse(weather.updatedAt);
}

/**
 * Consulta al proveedor y guarda el resultado. Si falla, degrada al último dato guardado marcado como `stale` mientras
 * tenga menos de 3 horas; más viejo ya no sirve como clima "ahora" y el error llega al cliente.
 */
async function refreshWeather(): Promise<CurrentWeather> {
  const { name, latitude, longitude } = config.openMeteo.defaultLocation;
  try {
    const reading = await fetchWeather({ latitude, longitude });
    cache = { ...reading, city: name, updatedAt: new Date().toISOString(), stale: false };
    return cache;
  } catch (err) {
    if (cache && ageMs(cache) <= MAX_STALE_AGE_MS) {
      logger.warn({ err }, 'Open-Meteo falló: se devuelve el último clima guardado');
      return { ...cache, stale: true };
    }
    throw err;
  }
}

/**
 * Sirve el clima desde un caché en memoria de 15 minutos, el intervalo con el que Open-Meteo actualiza el dato actual.
 * Las llamadas simultáneas comparten una sola consulta al proveedor. Los errores no se cachean, y un reinicio de la API
 * vacía el caché. Temperaturas enteras en °C, con mín/máx del día en APP_TIMEZONE; `updatedAt` es cuándo la API obtuvo
 * el dato. La ciudad es la de la config, y el query vacío de la ruta impide que una coordenada exacta llegue a los logs.
 */
export async function getCurrentWeather(): Promise<CurrentWeather> {
  if (cache && ageMs(cache) < CACHE_TTL_MS) return cache;
  if (inFlight) return inFlight;

  inFlight = refreshWeather().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

/** Solo para tests: el caché es estado de módulo y sobrevive entre casos. */
export function resetWeatherCache(): void {
  cache = null;
  inFlight = null;
}
