import { ignoreError } from '@omni/shared/common';

const storageKey = (username: string) => `omni.gym.lastPlan.${username}`;

/** El último plan de gimnasio que abrió la persona en este navegador, o `null` si no hay (o el almacenamiento no está disponible). */
export function readLastGymPlan(username: string): string | null {
  try {
    return localStorage.getItem(storageKey(username));
  } catch {
    return null;
  }
}

/** Recuerda el plan abierto por persona para que `/gym` lo vuelva a abrir. */
export function saveLastGymPlan(username: string, planId: string): void {
  try {
    localStorage.setItem(storageKey(username), planId);
  } catch {
    ignoreError();
  }
}

/** Borra el plan recordado de la persona al cerrar o perder la sesión: no debe quedar en un navegador compartido. */
export function clearLastGymPlan(username: string): void {
  try {
    localStorage.removeItem(storageKey(username));
  } catch {
    ignoreError();
  }
}
