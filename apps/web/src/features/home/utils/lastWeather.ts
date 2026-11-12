import type { CurrentWeather } from '@omni/shared/weather';

import { parseStoredWeather } from '@omni/shared/weather';

const storageKey = (username: string) => `omni-last-weather:${username}`;

/** Último clima que guardó este navegador para la persona, o `null` si no hay, es inválido o ya no sirve. */
export function readLastWeather(username: string): CurrentWeather | null {
  try {
    return parseStoredWeather(localStorage.getItem(storageKey(username)));
  } catch {
    return null;
  }
}

/** Guarda el último clima recibido por persona: es el respaldo si la API no puede responder (cold start, caída). */
export function saveLastWeather(username: string, weather: CurrentWeather): void {
  try {
    localStorage.setItem(storageKey(username), JSON.stringify(weather));
  } catch {}
}
