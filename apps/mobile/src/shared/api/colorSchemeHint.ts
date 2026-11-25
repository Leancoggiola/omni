import * as SecureStore from 'expo-secure-store';
import { parseColorSchemeHint } from '@omni/shared/theme';

import type { ProfileTheme } from '@omni/shared/users';

const COLOR_SCHEME_HINT_KEY = 'omni.colorSchemeHint';

/**
 * Tema del perfil de la última sesión en este dispositivo (= `colorSchemeHint` de web). Sirve solo para el primer
 * cuadro, mientras la sesión se verifica al abrir la app: la splash espera esta lectura. `null` si no hay o si
 * SecureStore falla (entonces se sigue al sistema).
 */
export async function readColorSchemeHint(): Promise<ProfileTheme | null> {
  try {
    return parseColorSchemeHint(await SecureStore.getItemAsync(COLOR_SCHEME_HINT_KEY));
  } catch {
    return null;
  }
}

/** Guarda el tema del perfil de la sesión abierta. Un fallo de SecureStore se ignora: la próxima apertura sigue al sistema. */
export async function saveColorSchemeHint(theme: ProfileTheme): Promise<void> {
  try {
    await SecureStore.setItemAsync(COLOR_SCHEME_HINT_KEY, theme);
  } catch {
    return;
  }
}

/** Se borra al quedar sin sesión, así el login de otra persona no abre con el tema de la anterior. */
export async function clearColorSchemeHint(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(COLOR_SCHEME_HINT_KEY);
  } catch {
    return;
  }
}
