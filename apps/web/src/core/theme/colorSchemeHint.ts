import { COLOR_SCHEME_HINT_KEY } from './colorSchemeBoot';

import type { ProfileTheme } from '@omni/shared/users';

import { ignoreError } from '@omni/shared/common';
import { parseColorSchemeHint } from '@omni/shared/theme';

/**
 * Tema del perfil de la última sesión de este navegador. Sirve solo para el primer pintado (el script de
 * `index.html` y el valor inicial de Mantine) mientras la sesión carga: no es un override y no se sincroniza entre
 * pestañas. Sin storage no hay pista.
 */
export function getColorSchemeHint(): ProfileTheme | null {
  try {
    return parseColorSchemeHint(localStorage.getItem(COLOR_SCHEME_HINT_KEY));
  } catch {
    return null;
  }
}

/** Lo escribe `useSyncColorScheme` con cada tema del perfil; si el storage falla, la próxima carga sigue al sistema. */
export function setColorSchemeHint(theme: ProfileTheme): void {
  try {
    localStorage.setItem(COLOR_SCHEME_HINT_KEY, theme);
  } catch {
    ignoreError();
  }
}

/** Se borra al quedar sin sesión, así el login del próximo usuario no arranca con el tema del anterior. */
export function clearColorSchemeHint(): void {
  try {
    localStorage.removeItem(COLOR_SCHEME_HINT_KEY);
  } catch {
    ignoreError();
  }
}
