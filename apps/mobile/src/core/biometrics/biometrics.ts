import { AuthenticationType } from 'expo-local-authentication';

import type { NavKey } from '@omni/shared/navigation';

export type BiometricKind = 'fingerprint' | 'face' | 'both' | 'generic';

export type BiometricResult = 'success' | 'cancelled' | 'failed';

export const SENSITIVE_MODULES: readonly NavKey[] = ['expenses', 'split-expenses'];

export const SENSITIVE_UNLOCK_TTL_MS = 5 * 60 * 1000;

const CANCEL_ERRORS = new Set(['user_cancel', 'system_cancel', 'app_cancel']);

/** Si el módulo pide biometría para abrirse (lista en código: elegirlos desde la UI está fuera de alcance). */
export function isSensitiveModule(key: NavKey): boolean {
  return SENSITIVE_MODULES.includes(key);
}

/**
 * Qué biometría ofrece el dispositivo según lo que informa el sistema: solo huella, solo rostro, las dos (Android con
 * ambas enroladas) o genérica (iris u otro tipo sin nombre propio). Sirve para adaptar los textos.
 */
export function detectBiometricKind(types: readonly AuthenticationType[]): BiometricKind {
  const fingerprint = types.includes(AuthenticationType.FINGERPRINT);
  const face = types.includes(AuthenticationType.FACIAL_RECOGNITION);
  if (fingerprint && face) return 'both';
  if (fingerprint) return 'fingerprint';
  if (face) return 'face';
  return 'generic';
}

const NOUNS: Record<BiometricKind, string> = {
  fingerprint: 'huella',
  face: 'rostro',
  both: 'huella o rostro',
  generic: 'biometría',
};

/** Nombre de la biometría para los textos de la UI ("Ingresar con huella", "Ingresar con rostro"). */
export function biometricNoun(kind: BiometricKind): string {
  return NOUNS[kind];
}

/** Traduce el resultado de `authenticateAsync`: cancelar es una decisión de la persona, no un error. */
export function toBiometricResult(result: { success: true } | { success: false; error: string }): BiometricResult {
  if (result.success) return 'success';
  return CANCEL_ERRORS.has(result.error) ? 'cancelled' : 'failed';
}

/** Si el último desbloqueo de módulos sensibles sigue vigente: existe y no pasó `SENSITIVE_UNLOCK_TTL_MS`. */
export function isUnlockFresh(unlockedAt: number | null, now: number): boolean {
  return unlockedAt !== null && now - unlockedAt <= SENSITIVE_UNLOCK_TTL_MS;
}
