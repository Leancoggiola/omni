import { ApiError } from './fetcher';
import { ensureRefreshed, notifyAuthFailure, shouldSkipRefresh } from './refreshSession';

type HttpMethod = 'POST' | 'PUT' | 'PATCH' | 'DELETE';

async function request<T = unknown>(url: string, method: HttpMethod, body?: unknown, retried = false): Promise<T> {
  const res = await fetch(url, {
    method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: body != null ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && !retried && !shouldSkipRefresh(url)) {
    const ok = await ensureRefreshed();
    if (ok) return request<T>(url, method, body, true);
    notifyAuthFailure();
  }

  if (!res.ok) {
    const info = await res.json().catch(() => ({}));
    throw new ApiError((info as Record<string, string>).message || res.statusText, res.status, info);
  }

  // Handle 204 No Content
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  post: <T = unknown>(url: string, body?: unknown) => request<T>(url, 'POST', body),
  put: <T = unknown>(url: string, body?: unknown) => request<T>(url, 'PUT', body),
  patch: <T = unknown>(url: string, body?: unknown) => request<T>(url, 'PATCH', body),
  delete: <T = unknown>(url: string) => request<T>(url, 'DELETE'),
};
