import { getSessionColorScheme } from './sessionColorScheme';

import type { MantineColorSchemeManager } from '@mantine/core';

/** Clave del `localStorageColorSchemeManager` por defecto de Mantine (versiones previas de la app). */
export const LEGACY_COLOR_SCHEME_KEY = 'mantine-color-scheme-value';

/**
 * Manager de esquema de color sin persistencia propia.
 *
 * El default de Mantine guarda cada `setColorScheme` en localStorage y lo sincroniza entre pestañas:
 * el toggle de una pestaña cambiaba las demás y, tras el logout, el login arrancaba con el tema
 * del usuario anterior. Acá la única fuente persistida es el override de sesión, que ya escriben
 * `setSessionColorScheme` / `clearSessionColorScheme`. `set` no escribe nada a propósito:
 * `useSyncColorScheme` también llama a `setColorScheme` con el tema del perfil, y eso no es un
 * override. Sin override, `get` cae al `defaultColorScheme` del provider. Sin acceso a storage no hay valor
 * viejo que limpiar.
 */
export function createSessionColorSchemeManager(): MantineColorSchemeManager {
  try {
    localStorage.removeItem(LEGACY_COLOR_SCHEME_KEY);
  } catch {}

  return {
    get: defaultValue => getSessionColorScheme() ?? defaultValue,
    set: () => {},
    subscribe: () => {},
    unsubscribe: () => {},
    clear: () => {},
  };
}
