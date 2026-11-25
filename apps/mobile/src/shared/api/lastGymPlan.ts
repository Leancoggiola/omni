import * as SecureStore from 'expo-secure-store';

import { ignoreError } from '@omni/shared/common';

const storageKey = (username: string) => `omni.gym.lastPlan.${username}`;

/**
 * Id del último plan del gimnasio que abrió la persona en este dispositivo, o `null` si no hay. Es una comodidad
 * (abrir en el plan de siempre): un fallo de SecureStore se lee como "sin plan".
 */
export async function readLastGymPlan(username: string): Promise<string | null> {
  try {
    return (await SecureStore.getItemAsync(storageKey(username))) || null;
  } catch {
    return null;
  }
}

/** Guarda el plan abierto por persona; `null` lo olvida (el plan se borró). Un fallo de SecureStore se ignora. */
export async function saveLastGymPlan(username: string, planId: string | null): Promise<void> {
  try {
    if (planId) await SecureStore.setItemAsync(storageKey(username), planId);
    else await SecureStore.deleteItemAsync(storageKey(username));
  } catch {
    ignoreError();
  }
}

/** Borra el plan recordado de la persona al cerrar o perder la sesión: no debe quedar en un teléfono compartido. */
export async function clearLastGymPlan(username: string): Promise<void> {
  await saveLastGymPlan(username, null);
}
