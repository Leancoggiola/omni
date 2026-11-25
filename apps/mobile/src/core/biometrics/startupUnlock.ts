let unlocked = false;

/**
 * Si el bloqueo de arranque ya se liberó en este proceso (biometría, contraseña o activación desde Perfil). Vive a
 * nivel de módulo y no en el estado del `BiometricsProvider` para que un nuevo montaje del layout raíz no vuelva a
 * leer la preferencia, deje la app bloqueada otra vez y mande al login. Se reinicia solo con un arranque en frío.
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
