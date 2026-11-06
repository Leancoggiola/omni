import * as SecureStore from 'expo-secure-store';

const REMEMBERED_USER_KEY = 'omni.rememberedUser';

/**
 * Devuelve el nombre de usuario recordado en el dispositivo, o `null` si no hay (o si SecureStore falla: recordar
 * al usuario es una comodidad y nunca debe romper el login).
 */
export async function getRememberedUser(): Promise<string | null> {
  try {
    return (await SecureStore.getItemAsync(REMEMBERED_USER_KEY)) || null;
  } catch {
    return null;
  }
}

/**
 * Guarda solo el nombre de usuario tras un login exitoso. Nunca recibe contraseña ni tokens (esos viven en
 * `tokenStorage`). Un fallo de SecureStore se ignora.
 */
export async function setRememberedUser(username: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(REMEMBERED_USER_KEY, username);
  } catch {
    return;
  }
}

/** Olvida al usuario recordado ("Ingresar con otro usuario"). Cerrar sesión no la llama. */
export async function clearRememberedUser(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(REMEMBERED_USER_KEY);
  } catch {
    return;
  }
}
