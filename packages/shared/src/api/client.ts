/// <reference lib="dom" />

import { toApiError } from './errors';
import { API_PATHS } from './paths';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

type AuthHeaders = Record<string, string>;

export interface ApiClientOptions {
  fetch: (url: string, init: RequestInit) => Promise<Response>;
  toUrl?: (path: string) => string;
  credentials?: RequestCredentials;
  getAuthHeaders?: () => Promise<AuthHeaders | null>;
  refresh: () => Promise<boolean>;
  onAuthFailure?: () => void;
}

export interface ApiClient {
  get: <T = unknown>(path: string) => Promise<T>;
  post: <T = unknown>(path: string, body?: unknown) => Promise<T>;
  put: <T = unknown>(path: string, body?: unknown) => Promise<T>;
  patch: <T = unknown>(path: string, body?: unknown) => Promise<T>;
  delete: <T = unknown>(path: string) => Promise<T>;
  fetcher: <T = unknown>(path: string) => Promise<T>;
  waitForRefresh: (maxMs: number) => Promise<void>;
}

const NO_REFRESH_PATHS: readonly string[] = [API_PATHS.auth.login, API_PATHS.auth.logout, API_PATHS.auth.refresh];

/** Mismos headers de auth (o los dos `null`): el request salió con la sesión que sigue vigente. */
function sameAuthHeaders(a: AuthHeaders | null, b: AuthHeaders | null): boolean {
  if (a === null || b === null) return a === b;
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every(key => a[key] === b[key]);
}

/**
 * Núcleo HTTP de web y mobile. Cada request lleva JSON (`Content-Type` fuera de GET), `credentials` y los headers de
 * `getAuthHeaders`; una respuesta no OK lanza `ApiError` (`toApiError`) y un 204 devuelve `undefined`.
 *
 * Ante un 401 (salvo en login, logout y refresh) recupera la sesión y reintenta una sola vez:
 * - sin `getAuthHeaders` (web, cookies) siempre refresca;
 * - con `getAuthHeaders` (mobile, Bearer) los vuelve a leer: `null` es que ya no hay sesión y no refresca; si cambiaron
 *   desde que salió el request, otro refresh ya rotó y alcanza con reintentar; si siguen iguales, refresca.
 *
 * El refresh es single-flight: todos los 401 que llegan mientras vuela esperan el mismo resultado (o el mismo error,
 * que se propaga tal cual). `refresh` devuelve `true` si renovó y `false` si la sesión ya no es válida; en ese caso se
 * avisa `onAuthFailure` una sola vez por refresh fallido y el request lanza su 401. `waitForRefresh(maxMs)` espera a
 * que no quede un refresh en curso, con tope por cada uno (el logout de mobile, para no mandar un token ya rotado).
 */
export function createApiClient({
  fetch,
  toUrl = path => path,
  credentials,
  getAuthHeaders,
  refresh,
  onAuthFailure,
}: ApiClientOptions): ApiClient {
  let refreshPromise: Promise<boolean> | null = null;

  function ensureRefreshed(): Promise<boolean> {
    refreshPromise ??= refresh()
      .then(ok => {
        if (!ok) onAuthFailure?.();
        return ok;
      })
      .finally(() => {
        refreshPromise = null;
      });
    return refreshPromise;
  }

  async function recoverFromUnauthorized(sentAuthHeaders: AuthHeaders | null): Promise<boolean> {
    if (!getAuthHeaders) return ensureRefreshed();
    const currentAuthHeaders = await getAuthHeaders();
    if (currentAuthHeaders === null) return false;
    if (sameAuthHeaders(currentAuthHeaders, sentAuthHeaders)) return ensureRefreshed();
    return true;
  }

  async function request<T>(path: string, method: HttpMethod, body?: unknown, retried = false): Promise<T> {
    const authHeaders = getAuthHeaders ? await getAuthHeaders() : null;
    const headers: Record<string, string> = {
      ...(method !== 'GET' && { 'Content-Type': 'application/json' }),
      ...authHeaders,
    };

    const res = await fetch(toUrl(path), {
      method,
      headers,
      credentials,
      body: body != null ? JSON.stringify(body) : undefined,
    });

    if (res.status === 401 && !retried && !NO_REFRESH_PATHS.includes(path)) {
      if (await recoverFromUnauthorized(authHeaders)) return request<T>(path, method, body, true);
    }

    if (!res.ok) throw await toApiError(res);

    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  }

  async function waitForRefresh(maxMs: number): Promise<void> {
    while (refreshPromise) {
      let timer: ReturnType<typeof setTimeout> | undefined;
      const timedOut = await Promise.race([
        refreshPromise.then(
          () => false,
          () => false
        ),
        new Promise<boolean>(resolve => {
          timer = setTimeout(() => resolve(true), maxMs);
        }),
      ]);
      clearTimeout(timer);
      if (timedOut) return;
    }
  }

  const get = <T = unknown>(path: string) => request<T>(path, 'GET');

  return {
    get,
    post: (path, body) => request(path, 'POST', body),
    put: (path, body) => request(path, 'PUT', body),
    patch: (path, body) => request(path, 'PATCH', body),
    delete: path => request(path, 'DELETE'),
    fetcher: get,
    waitForRefresh,
  };
}
