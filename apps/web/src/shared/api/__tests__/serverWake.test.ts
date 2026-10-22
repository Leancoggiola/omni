import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { api, fetcher } from '../client';
import { SWR_KEYS } from '../keys';
import { ensureServerAwake, fetchWithWake } from '../serverWake';

import { ApiError } from '@omni/shared/api';

const JSON_HEADERS = new Headers({ 'content-type': 'application/json' });
const HTML_HEADERS = new Headers({ 'content-type': 'text/html; charset=utf-8' });

const jsonResponse = (body: unknown, status = 200) => ({
  ok: status < 400,
  status,
  statusText: '',
  headers: JSON_HEADERS,
  json: () => Promise.resolve(body),
});

const htmlResponse = (status = 502) => ({
  ok: false,
  status,
  statusText: 'Bad Gateway',
  headers: HTML_HEADERS,
  json: () => Promise.reject(new SyntaxError('Unexpected token <')),
});

describe('serverWake (instancia web)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('pide el health de SWR_KEYS sin caché y reintenta el request original', async () => {
    const fetchMock = vi.fn((url: string) =>
      Promise.resolve(url === SWR_KEYS.health ? jsonResponse({ status: 'ok' }) : htmlResponse())
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchWithWake('/api/resource')).rejects.toBeInstanceOf(ApiError);

    expect(fetchMock).toHaveBeenCalledWith(SWR_KEYS.health, expect.objectContaining({ cache: 'no-store' }));
  });

  it('lanza ApiError 503 si el servidor no despierta', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(htmlResponse(502)));

    const assertion = expect(fetchWithWake('/api/resource')).rejects.toMatchObject({ name: 'ApiError', status: 503 });
    await vi.advanceTimersByTimeAsync(95_000);
    await assertion;
  });

  it('sin conexión (navigator.onLine false) ensureServerAwake no espera los 90 s', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    vi.stubGlobal('navigator', { onLine: false });

    await expect(ensureServerAwake()).resolves.toBe(false);
  });
});

describe('api and fetcher integration', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('fetcher survives a cold start', async () => {
    let calls = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url === SWR_KEYS.health) return Promise.resolve(jsonResponse({ status: 'ok' }));
        calls += 1;
        return Promise.resolve(calls === 1 ? htmlResponse(504) : jsonResponse({ list: [] }));
      })
    );

    await expect(fetcher('/api/media/list')).resolves.toEqual({ list: [] });
  });

  it('the refresh retries right away after a proxy 504, inside the rotation grace of the API', async () => {
    let resourceCalls = 0;
    let refreshCalls = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url === SWR_KEYS.health) return Promise.resolve(jsonResponse({ status: 'ok' }));
        if (url === SWR_KEYS.auth.refresh) {
          refreshCalls += 1;
          return Promise.resolve(refreshCalls === 1 ? htmlResponse(504) : jsonResponse({ ok: true }));
        }
        resourceCalls += 1;
        return Promise.resolve(resourceCalls === 1 ? jsonResponse({ message: 'No' }, 401) : jsonResponse({ ok: 1 }));
      })
    );

    await expect(fetcher('/api/resource')).resolves.toEqual({ ok: 1 });
    expect(refreshCalls).toBe(2);
  });

  it('api.post surfaces a 500 JSON error without retrying', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ message: 'Fallo interno' }, 500));
    vi.stubGlobal('fetch', fetchMock);

    await expect(api.post('/api/resource', { a: 1 })).rejects.toMatchObject({ status: 500, message: 'Fallo interno' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
