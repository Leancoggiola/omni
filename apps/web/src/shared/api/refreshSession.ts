import { ApiError } from './ApiError';
import { SWR_KEYS } from './keys';
import { fetchWithWake } from './serverWake';

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

/**
 * `true` si el refresh renovó la sesión y `false` solo si la API la declara inválida (401/403). Cualquier otra
 * respuesta (5xx, 429) o un error de red lanza: no prueba que la sesión se haya perdido, así que no la cierra.
 */
async function refreshAccessToken(): Promise<boolean> {
  const res = await fetchWithWake(SWR_KEYS.auth.refresh, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
  if (res.ok) return true;
  if (res.status === 401 || res.status === 403) return false;

  const info = await res.json().catch(() => ({}));
  throw new ApiError((info as Record<string, string>).message || res.statusText, res.status, info);
}

/** Single-flight: si ya hay un refresh en curso, todos los callers esperan el mismo resultado (o el mismo error). */
export async function ensureRefreshed(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}
