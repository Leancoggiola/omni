import * as SecureStore from 'expo-secure-store';

import { ignoreError } from '@omni/shared/common';
import { parseStoredWeather } from '@omni/shared/weather';

import type { CurrentWeather } from '@omni/shared/weather';

const storageKey = (username: string) => `omni.lastWeather.${username}`;

/**
 * Último clima que guardó este dispositivo para la persona, o `null` si no hay, es inválido o ya no sirve. Guardar el
 * clima es una comodidad (respaldo si la API no responde): un fallo de SecureStore se ignora.
 */
export async function readLastWeather(username: string): Promise<CurrentWeather | null> {
  try {
    return parseStoredWeather(await SecureStore.getItemAsync(storageKey(username)));
  } catch {
    return null;
  }
}

/** Guarda el último clima recibido por persona. No guarda coordenadas: solo el dato del contrato. */
export async function saveLastWeather(username: string, weather: CurrentWeather): Promise<void> {
  try {
    await SecureStore.setItemAsync(storageKey(username), JSON.stringify(weather));
  } catch {
    ignoreError();
  }
}
