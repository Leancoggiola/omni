import { SESSION_COLOR_SCHEME_KEY } from './colorSchemeBoot';

import type { ColorScheme } from '@omni/shared/theme';
import type { ProfileTheme } from '@omni/shared/users';

import { ignoreError } from '@omni/shared/common';

const isColorScheme = (value: string | null): value is ColorScheme => value === 'light' || value === 'dark';

/** Tema elegido con el toggle durante la sesión; pisa al del perfil hasta el logout o el cierre de la pestaña. */
export function getSessionColorScheme(): ColorScheme | null {
  try {
    const value = sessionStorage.getItem(SESSION_COLOR_SCHEME_KEY);
    return isColorScheme(value) ? value : null;
  } catch {
    return null;
  }
}

/** Sin storage el override vive solo en memoria (Mantine) hasta recargar. */
export function setSessionColorScheme(theme: ProfileTheme): void {
  try {
    sessionStorage.setItem(SESSION_COLOR_SCHEME_KEY, theme);
  } catch {
    ignoreError();
  }
}

/** Si el storage no responde no hay override que limpiar. */
export function clearSessionColorScheme(): void {
  try {
    sessionStorage.removeItem(SESSION_COLOR_SCHEME_KEY);
  } catch {
    ignoreError();
  }
}
