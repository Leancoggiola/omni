import { SWR_KEYS } from './keys';
import { fetchWithWake } from './serverWake';

import { createApiClient, toApiError } from '@omni/shared/api';

let onAuthFailure: (() => void) | null = null;

/** Registra el callback invocado cuando el refresh silencioso falla (sesión inválida). */
export function setOnAuthFailure(callback: () => void): void {
  onAuthFailure = callback;
}

/** Limpia el callback registrado (ej. al desmontar el AuthProvider). */
export function clearOnAuthFailure(): void {
  onAuthFailure = null;
}

/**
 * `true` si el refresh renovó la cookie de sesión y `false` solo si la API la declara inválida (401/403). Cualquier
 * otra respuesta (5xx, 429) o un error de red lanza: no prueba que la sesión se haya perdido, así que no la cierra. Se
 * pide como idempotente: la API acepta la misma cookie dentro de su gracia de rotación, y repetirlo enseguida ante un
 * timeout o un 504 evita quedar fuera de ella (lo que revocaría todas las sesiones).
 */
async function refreshSession(): Promise<boolean> {
  const res = await fetchWithWake(
    SWR_KEYS.auth.refresh,
    {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    },
    { idempotent: true }
  );
  if (res.ok) return true;
  if (res.status === 401 || res.status === 403) return false;
  throw await toApiError(res);
}

const client = createApiClient({
  fetch: (url, init) => fetchWithWake(url, init),
  credentials: 'include',
  refresh: refreshSession,
  onAuthFailure: () => onAuthFailure?.(),
});

export const api = {
  post: client.post,
  put: client.put,
  patch: client.patch,
  delete: client.delete,
};

export const { fetcher } = client;
