import type { ProfileTheme } from '@omni/shared/users';

const STORAGE_KEY = 'omni-session-color-scheme';

const isProfileTheme = (value: string | null): value is ProfileTheme => value === 'light' || value === 'dark';

/** Tema elegido con el toggle durante la sesión; pisa al del perfil hasta el logout o el cierre de la pestaña. */
export function getSessionColorScheme(): ProfileTheme | null {
  try {
    const value = sessionStorage.getItem(STORAGE_KEY);
    return isProfileTheme(value) ? value : null;
  } catch {
    return null;
  }
}

/** Sin storage el override vive solo en memoria (Mantine) hasta recargar. */
export function setSessionColorScheme(theme: ProfileTheme): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, theme);
  } catch {}
}

/** Si el storage no responde no hay override que limpiar. */
export function clearSessionColorScheme(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {}
}
