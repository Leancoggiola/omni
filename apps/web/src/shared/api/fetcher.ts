import { ensureRefreshed, notifyAuthFailure, shouldSkipRefresh } from './refreshSession';

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

async function request<T = unknown>(url: string, retried = false): Promise<T> {
  const res = await fetch(url, { credentials: 'include' });

  if (res.status === 401 && !retried && !shouldSkipRefresh(url)) {
    const ok = await ensureRefreshed();
    if (ok) return request<T>(url, true);
    notifyAuthFailure();
  }

  if (!res.ok) {
    const info = await res.json().catch(() => ({}));
    throw new ApiError((info as Record<string, string>).message || res.statusText, res.status, info);
  }

  return res.json();
}

export const fetcher = <T = unknown>(url: string): Promise<T> => request<T>(url);
