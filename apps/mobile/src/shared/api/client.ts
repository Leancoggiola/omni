import { API_KEYS } from './keys';
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from './tokenStorage';

import type { AuthTokensResponse } from '@omni/shared/auth';

export class ApiError extends Error {
  status: number;
  info: unknown;

  constructor(message: string, status: number, info?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.info = info;
  }
}

function getBaseUrl(): string {
  const base = (typeof process !== 'undefined' ? process.env.EXPO_PUBLIC_API_URL : undefined)?.replace(/\/$/, '');
  if (!base) {
    throw new ApiError('Falta EXPO_PUBLIC_API_URL (ej. http://192.168.x.x:3000). Ver apps/mobile/README.md', 0);
  }
  return base;
}

function toUrl(path: string): string {
  if (path.startsWith('http')) return path;
  return `${getBaseUrl()}${path}`;
}

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

async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) {
    notifyAuthFailure();
    return false;
  }

  const res = await fetch(toUrl(API_KEYS.auth.refresh), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) {
    await clearTokens();
    notifyAuthFailure();
    return false;
  }

  const data = (await res.json()) as AuthTokensResponse;
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

async function request<T = unknown>(path: string, method: HttpMethod, body?: unknown, retried = false): Promise<T> {
  const accessToken = await getAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const res = await fetch(toUrl(path), {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && !retried && path !== API_KEYS.auth.login && path !== API_KEYS.auth.refresh) {
    const ok = await ensureRefreshed();
    if (ok) return request<T>(path, method, body, true);
  }

  if (!res.ok) {
    const info = await res.json().catch(() => ({}));
    throw new ApiError((info as Record<string, string>).message || res.statusText, res.status, info);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  get: <T = unknown>(path: string) => request<T>(path, 'GET'),
  post: <T = unknown>(path: string, body?: unknown) => request<T>(path, 'POST', body),
  put: <T = unknown>(path: string, body?: unknown) => request<T>(path, 'PUT', body),
  patch: <T = unknown>(path: string, body?: unknown) => request<T>(path, 'PATCH', body),
  delete: <T = unknown>(path: string) => request<T>(path, 'DELETE'),
};

export const fetcher = <T = unknown>(path: string) => api.get<T>(path);
