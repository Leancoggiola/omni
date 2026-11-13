let unlocked = false;

/**
 * Si el bloqueo de arranque ya se liberó en este proceso (biometría, contraseña o activación desde Perfil). Vive a
 * nivel de módulo y no en el estado del `BiometricsProvider` porque expo-router vuelve a montar el layout raíz al
 * redirigir (login → tabs): con el estado del componente, el provider nuevo volvía a leer la preferencia, la app
 * quedaba bloqueada otra vez y `AuthGate` devolvía al login. Se reinicia solo con un arranque en frío.
 */
export function isStartupUnlocked(): boolean {
  return unlocked;
}

/** Marca el bloqueo de arranque como liberado hasta que el proceso termine. */
export function markStartupUnlocked(): void {
  unlocked = true;
}

/** Vuelve al estado de un arranque en frío. Solo para tests. */
export function resetStartupUnlock(): void {
  unlocked = false;
}
