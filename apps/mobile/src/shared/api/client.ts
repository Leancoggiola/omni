import { toUrl } from './baseUrl';
import { API_KEYS } from './keys';
import { fetchWithWake } from './serverWake';
import { clearTokens, getAccessToken, getRefreshToken, getTokens, setTokens } from './tokenStorage';

import { ApiError, createApiClient, toApiError } from '@omni/shared/api';

import { CLIENT_HEADER, MOBILE_CLIENT } from '@omni/shared/auth';

import type { AuthTokensResponse } from '@omni/shared/auth';

export { ApiError };

/**
 * Suma `CLIENT_HEADER` a cada request: con él, el login y el refresh emiten un refresh token de 90 días que se renueva
 * con cada uso, en vez de los 7 días de la web.
 */
function withClientHeader(init: RequestInit): RequestInit {
  return {
    ...init,
    headers: { ...(init.headers as Record<string, string> | undefined), [CLIENT_HEADER]: MOBILE_CLIENT },
  };
}

let onAuthFailure: (() => void) | null = null;

/** Registra el callback invocado cuando el refresh falla (sesión inválida), igual que en web. */
export function setOnAuthFailure(callback: () => void): void {
  onAuthFailure = callback;
}

/** Limpia el callback registrado (ej. al desmontar el AuthProvider). */
export function clearOnAuthFailure(): void {
  onAuthFailure = null;
}

/**
 * Resuelve un refresh cuya sesión pudo cambiar mientras el request volaba (logout, o un login nuevo): si el refresh
 * token guardado ya no es el que se usó, no se pisa ni se borra nada y solo se informa si queda una sesión con la
 * que reintentar.
 */
async function sessionChangedDuringRefresh(
  usedRefreshToken: string
): Promise<{ changed: boolean; hasSession: boolean }> {
  const current = await getTokens();
  return { changed: current?.refreshToken !== usedRefreshToken, hasSession: current !== null };
}

/**
 * Pide un par nuevo con el refresh token guardado. Solo un 401/403 significa que la sesión ya no es válida: limpia los
 * tokens y devuelve `false` (el núcleo avisa a `setOnAuthFailure` una vez). Un 5xx, un 429 o un error de red no dicen
 * nada de la sesión, así que se propagan (el `ApiError` es el del refresh, no el 401 original) y los tokens se
 * conservan para reintentar después. Si mientras tanto la sesión cambió, el resultado del refresh se descarta. Se pide
 * como idempotente: la API acepta el mismo refresh token dentro de su gracia de rotación, y repetirlo enseguida ante un
 * timeout o un 504 evita quedar fuera de ella con el token viejo (lo que revocaría todas las sesiones). La
 * comprobación y la escritura no son atómicas: un logout o login que caiga entre las dos lecturas y escrituras de
 * SecureStore puede quedar pisado.
 */
async function refreshAccessToken(): Promise<boolean> {
  const tokens = await getTokens();
  if (!tokens) return false;

  const res = await fetchWithWake(
    toUrl(API_KEYS.auth.refresh),
    withClientHeader({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: tokens.refreshToken }),
    }),
    { idempotent: true }
  );

  if (res.status === 401 || res.status === 403) {
    const { changed, hasSession } = await sessionChangedDuringRefresh(tokens.refreshToken);
    if (changed) return hasSession;
    await clearTokens();
    return false;
  }

  if (!res.ok) {
    const { changed, hasSession } = await sessionChangedDuringRefresh(tokens.refreshToken);
    if (changed) return hasSession;
    throw await toApiError(res);
  }

  const data = (await res.json()) as AuthTokensResponse;
  const { changed, hasSession } = await sessionChangedDuringRefresh(tokens.refreshToken);
  if (changed) return hasSession;
  await setTokens(data.accessToken, data.refreshToken);
  return true;
}

/**
 * `Authorization: Bearer` con el access token guardado, o `null` sin sesión. Un fallo de SecureStore cuenta como sin
 * sesión: el request sale igual, sin `Authorization`, y un 401 no dispara el refresh.
 */
async function getAuthHeaders(): Promise<Record<string, string> | null> {
  const accessToken = await getAccessToken().catch(() => null);
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : null;
}

const client = createApiClient({
  fetch: (url, init) => fetchWithWake(url, withClientHeader(init)),
  toUrl,
  getAuthHeaders,
  refresh: refreshAccessToken,
  onAuthFailure: () => onAuthFailure?.(),
});

const LOGOUT_REFRESH_WAIT_MS = 3_000;

/**
 * Cierra la sesión en el servidor con el refresh token vigente al momento de enviar. Espera un refresh en curso (hasta
 * `LOGOUT_REFRESH_WAIT_MS`, para no mandar un token que ya se rotó; un refresh colgado no puede demorar el logout) y no
 * pasa por el refresh por 401: el logout de la API no devuelve 401. Sin refresh token guardado no hay sesión que
 * cerrar en el servidor y no hace ningún request.
 */
export async function logoutSession(): Promise<void> {
  await client.waitForRefresh(LOGOUT_REFRESH_WAIT_MS);
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return;
  await client.post(API_KEYS.auth.logout, { refreshToken });
}

export const api = {
  get: client.get,
  post: client.post,
  put: client.put,
  patch: client.patch,
  delete: client.delete,
};

export const { fetcher } = client;
