import { ApiError } from './ApiError';
import { toUrl } from './baseUrl';
import { API_KEYS } from './keys';
import { fetchWithWake } from './serverWake';
import { clearTokens, getAccessToken, getRefreshToken, getTokens, setTokens } from './tokenStorage';

import type { AuthTokensResponse } from '@omni/shared/auth';

export { ApiError };

let refreshPromise: Promise<boolean> | null = null;
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
 * Avisa que la sesión ya no es válida para que la UI la cierre. Se llama desde dentro del
 * single-flight, así que dispara una vez por refresh fallido y no una por cada request con 401.
 */
function notifyAuthFailure(): void {
  onAuthFailure?.();
}

async function toApiError(res: Response): Promise<ApiError> {
  const info = await res.json().catch(() => ({}));
  return new ApiError((info as Record<string, string>).message || res.statusText, res.status, info);
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
 * Pide un par nuevo con el refresh token guardado. Solo un 401/403 significa que la sesión ya no es válida:
 * limpia los tokens y avisa. Un 5xx, un 429 o un error de red no dicen nada de la sesión, así que se propagan
 * (el `ApiError` es el del refresh, no el 401 original) y los tokens se conservan para reintentar después.
 * Si mientras tanto la sesión cambió, el resultado del refresh se descarta. La comprobación y la escritura no son
 * atómicas: un logout o login que caiga entre las dos lecturas y escrituras de SecureStore puede quedar pisado.
 */
async function refreshAccessToken(): Promise<boolean> {
  const tokens = await getTokens();
  if (!tokens) {
    notifyAuthFailure();
    return false;
  }

  const res = await fetchWithWake(toUrl(API_KEYS.auth.refresh), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: tokens.refreshToken }),
  });

  if (res.status === 401 || res.status === 403) {
    const { changed, hasSession } = await sessionChangedDuringRefresh(tokens.refreshToken);
    if (changed) return hasSession;
    await clearTokens();
    notifyAuthFailure();
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

async function ensureRefreshed(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

const NO_REFRESH_PATHS: string[] = [API_KEYS.auth.login, API_KEYS.auth.refresh, API_KEYS.auth.logout];

/**
 * Decide qué hacer con un 401 según el access token que viajó en ese request: si coincide con el guardado hay
 * que refrescar; si ya cambió (otro request refrescó mientras éste volaba) alcanza con reintentar, sin rotar de
 * nuevo; si ya no hay sesión no se refresca.
 */
async function recoverFromUnauthorized(sentAccessToken: string | null): Promise<boolean> {
  const currentAccessToken = await getAccessToken();
  if (currentAccessToken === null) return false;
  if (currentAccessToken === sentAccessToken) return ensureRefreshed();
  return true;
}

async function request<T = unknown>(path: string, method: HttpMethod, body?: unknown, retried = false): Promise<T> {
  const accessToken = await getAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const res = await fetchWithWake(toUrl(path), {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && !retried && !NO_REFRESH_PATHS.includes(path)) {
    const ok = await recoverFromUnauthorized(accessToken);
    if (ok) return request<T>(path, method, body, true);
  }

  if (!res.ok) throw await toApiError(res);

  if (res.status === 204) return undefined as T;
  return res.json();
}

const LOGOUT_REFRESH_WAIT_MS = 10_000;

/**
 * Espera a que termine el refresh en curso, hasta `LOGOUT_REFRESH_WAIT_MS`: un refresh colgado (ej. esperando que
 * la API despierte) no puede demorar el logout. Si se agota el tiempo se sigue con el token que haya guardado; si
 * ya se rotó, la API borra también los sucesores recién rotados.
 */
async function waitForRefreshToSettle(): Promise<void> {
  while (refreshPromise) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timedOut = await Promise.race([
      refreshPromise.then(
        () => false,
        () => false
      ),
      new Promise<boolean>(resolve => {
        timer = setTimeout(() => resolve(true), LOGOUT_REFRESH_WAIT_MS);
      }),
    ]);
    clearTimeout(timer);
    if (timedOut) return;
  }
}

/**
 * Cierra la sesión en el servidor con el refresh token vigente al momento de enviar. Espera un refresh en curso
 * (con tope) para no mandar un token que ya se rotó, y no pasa por el refresh por 401: el logout de la API no
 * devuelve 401. Sin refresh token guardado no hay sesión que cerrar en el servidor y no hace ningún request.
 */
export async function logoutSession(): Promise<void> {
  await waitForRefreshToSettle();
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return;
  await request(API_KEYS.auth.logout, 'POST', { refreshToken });
}

export const api = {
  get: <T = unknown>(path: string) => request<T>(path, 'GET'),
  post: <T = unknown>(path: string, body?: unknown) => request<T>(path, 'POST', body),
  put: <T = unknown>(path: string, body?: unknown) => request<T>(path, 'PUT', body),
  patch: <T = unknown>(path: string, body?: unknown) => request<T>(path, 'PATCH', body),
  delete: <T = unknown>(path: string) => request<T>(path, 'DELETE'),
};

export const fetcher = <T = unknown>(path: string) => api.get<T>(path);
