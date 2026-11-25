import { useEffect, useSyncExternalStore } from 'react';

interface LaunchState {
  destinationReady: boolean;
  finished: boolean;
}

export const LAUNCH_DESTINATION_TIMEOUT_MS = 3000;

const COLD_START: LaunchState = { destinationReady: false, finished: false };

let state = COLD_START;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getState() {
  return state;
}

function update(changes: Partial<LaunchState>) {
  state = { ...state, ...changes };
  listeners.forEach(listener => listener());
}

/** Avisa que la pantalla en la que desemboca el arranque ya está dibujada: la animación puede cerrar. */
export function markLaunchDestinationReady(): void {
  if (!state.destinationReady) update({ destinationReady: true });
}

/** Da por terminada la animación de arranque hasta que el proceso termine. */
export function finishLaunch(): void {
  if (!state.finished) update({ finished: true });
}

/** Vuelve al estado de un arranque en frío. Solo para tests. */
export function resetLaunch(): void {
  update(COLD_START);
}

/**
 * Estado del arranque en frío (#332). Vive a nivel de módulo, como `startupUnlock`, para que un nuevo montaje del
 * layout raíz no repita la animación: solo se reinicia con un arranque en frío.
 */
export function useLaunchState(): LaunchState {
  return useSyncExternalStore(subscribe, getState);
}

/** Para las pantallas en las que puede desembocar el arranque: con `ready` avisa que ya se pueden mostrar. */
export function useLaunchDestination(ready: boolean): void {
  useEffect(() => {
    if (ready) markLaunchDestinationReady();
  }, [ready]);
}

/**
 * Tope de seguridad: con `settled` (sesión y biometría resueltas), si en `LAUNCH_DESTINATION_TIMEOUT_MS` ninguna
 * pantalla avisó con `useLaunchDestination`, se la da por lista, así la animación cierra y lo que espera a que termine
 * no queda bloqueado. Mientras la sesión se verifica no corre: esa espera no tiene tope.
 */
export function useLaunchDeadline(settled: boolean): void {
  useEffect(() => {
    if (!settled) return;
    const timer = setTimeout(markLaunchDestinationReady, LAUNCH_DESTINATION_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [settled]);
}
