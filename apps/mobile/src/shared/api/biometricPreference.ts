import * as SecureStore from 'expo-secure-store';

const BIOMETRIC_ENABLED_KEY = 'omni.biometricEnabled';

/**
 * Devuelve si la persona activó la biometría en este dispositivo. Un fallo de SecureStore cuenta como "no activada":
 * la biometría es una comodidad y nunca debe dejar a nadie fuera de la app (la contraseña siempre sirve).
 */
export async function getBiometricEnabled(): Promise<boolean> {
  try {
    return (await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY)) === '1';
  } catch {
    return false;
  }
}

/**
 * Guarda o borra la preferencia. Es por dispositivo (no viaja con el perfil): la huella o el rostro enrolados son del
 * teléfono, y no tiene sentido que activarla en uno la encienda en otro. A diferencia de `getBiometricEnabled`, un
 * fallo de SecureStore se propaga: el toggle de Perfil tiene que avisar que no quedó guardada.
 */
export async function setBiometricEnabled(enabled: boolean): Promise<void> {
  if (enabled) await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, '1');
  else await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
}
