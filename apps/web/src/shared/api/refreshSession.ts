import { SWR_KEYS } from './keys';

let refreshPromise: Promise<boolean> | null = null;
let onAuthFailure: (() => void) | null = null;

/** Registra el callback invocado cuando el refresh silencioso falla (sesión inválida). */
export function setOnAuthFailure(callback: () => void): void {
  onAuthFailure = callback;
}

/** Limpia el callback registrado (ej. al desmontar el AuthProvider). */
export function clearOnAuthFailure(): void {
  onAuthFailure = null;
}

/** Notifica que el refresh falló para que la UI cierre la sesión. */
export function notifyAuthFailure(): void {
  onAuthFailure?.();
}

/** Evita loops de refresh en los propios endpoints de auth. */
export function shouldSkipRefresh(url: string): boolean {
  return url === SWR_KEYS.auth.login || url === SWR_KEYS.auth.logout || url === SWR_KEYS.auth.refresh;
}

async function refreshAccessToken(): Promise<boolean> {
  const res = await fetch(SWR_KEYS.auth.refresh, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
  return res.ok;
}

/** Single-flight: si ya hay un refresh en curso, todos los callers esperan el mismo resultado. */
export async function ensureRefreshed(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}
