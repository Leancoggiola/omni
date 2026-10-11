import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { api } from '../client';
import { fetcher } from '../fetcher';
import { SWR_KEYS } from '../keys';
import { ensureServerAwake, fetchWithWake, subscribeServerWake } from '../serverWake';

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

const countCalls = (fetchMock: ReturnType<typeof vi.fn>, url: string) =>
  fetchMock.mock.calls.filter(([calledUrl]) => calledUrl === url).length;

describe('fetchWithWake', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('returns the response untouched when the API answers JSON', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);

    const res = await fetchWithWake('/api/resource');

    expect(await res.json()).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not retry a 500 JSON error from the API', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ message: 'boom' }, 500));
    vi.stubGlobal('fetch', fetchMock);

    const res = await fetchWithWake('/api/resource', { method: 'POST' });

    expect(res.status).toBe(500);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('accepts a 204 without content-type', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 204, headers: new Headers() });
    vi.stubGlobal('fetch', fetchMock);

    const res = await fetchWithWake('/api/resource', { method: 'DELETE' });

    expect(res.status).toBe(204);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('polls health after an HTML 502 and retries the original request', async () => {
    let healthCalls = 0;
    const fetchMock = vi.fn((url: string) => {
      if (url === SWR_KEYS.health) {
        healthCalls += 1;
        return Promise.resolve(healthCalls < 3 ? htmlResponse(503) : jsonResponse({ status: 'ok' }));
      }
      return Promise.resolve(
        fetchMock.mock.calls.filter(([u]) => u === url).length === 1 ? htmlResponse() : jsonResponse({ data: 1 })
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    const promise = fetchWithWake('/api/resource', { method: 'POST' });
    await vi.advanceTimersByTimeAsync(2_000 + 4_000);
    const res = await promise;

    expect(await res.json()).toEqual({ data: 1 });
    expect(healthCalls).toBe(3);
    expect(countCalls(fetchMock, '/api/resource')).toBe(2);
  });

  it('polls health after a network error and retries the original request', async () => {
    let resourceCalls = 0;
    const fetchMock = vi.fn((url: string) => {
      if (url === SWR_KEYS.health) return Promise.resolve(jsonResponse({ status: 'ok' }));
      resourceCalls += 1;
      return resourceCalls === 1
        ? Promise.reject(new TypeError('Failed to fetch'))
        : Promise.resolve(jsonResponse({ data: 2 }));
    });
    vi.stubGlobal('fetch', fetchMock);

    const res = await fetchWithWake('/api/resource');

    expect(await res.json()).toEqual({ data: 2 });
    expect(countCalls(fetchMock, SWR_KEYS.health)).toBe(1);
  });

  it('shares a single polling between concurrent requests', async () => {
    let healthCalls = 0;
    const served = new Set<string>();
    const fetchMock = vi.fn((url: string) => {
      if (url === SWR_KEYS.health) {
        healthCalls += 1;
        return Promise.resolve(healthCalls < 2 ? htmlResponse(503) : jsonResponse({ status: 'ok' }));
      }
      if (!served.has(url)) {
        served.add(url);
        return Promise.resolve(htmlResponse());
      }
      return Promise.resolve(jsonResponse({ url }));
    });
    vi.stubGlobal('fetch', fetchMock);

    const a = fetchWithWake('/api/a');
    const b = fetchWithWake('/api/b');
    await vi.advanceTimersByTimeAsync(2_000);
    const [resA, resB] = await Promise.all([a, b]);

    expect(await resA.json()).toEqual({ url: '/api/a' });
    expect(await resB.json()).toEqual({ url: '/api/b' });
    expect(healthCalls).toBe(2);
  });

  it('throws ApiError 503 when the server does not wake up in time', async () => {
    const fetchMock = vi.fn().mockResolvedValue(htmlResponse(502));
    vi.stubGlobal('fetch', fetchMock);

    const promise = fetchWithWake('/api/resource');
    const assertion = expect(promise).rejects.toMatchObject({
      name: 'ApiError',
      status: 503,
      message: 'El servidor no responde. Probá de nuevo en unos minutos.',
    });
    await vi.advanceTimersByTimeAsync(95_000);
    await assertion;

    expect(countCalls(fetchMock, '/api/resource')).toBe(1);
    expect(countCalls(fetchMock, SWR_KEYS.health)).toBeGreaterThan(5);
  });

  it('throws ApiError 503 when the request still fails after the server wakes', async () => {
    const fetchMock = vi.fn((url: string) =>
      Promise.resolve(url === SWR_KEYS.health ? jsonResponse({ status: 'ok' }) : htmlResponse(502))
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchWithWake('/api/resource')).rejects.toMatchObject({ status: 503 });
    expect(countCalls(fetchMock, '/api/resource')).toBe(2);
  });

  it('does not retry when the caller aborted the request', async () => {
    const controller = new AbortController();
    controller.abort();
    const fetchMock = vi.fn().mockRejectedValue(new DOMException('aborted', 'AbortError'));
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchWithWake('/api/resource', { signal: controller.signal })).rejects.toMatchObject({
      name: 'AbortError',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('notifies subscribers while waking and when it ends', async () => {
    let healthCalls = 0;
    const fetchMock = vi.fn((url: string) => {
      if (url === SWR_KEYS.health) {
        healthCalls += 1;
        return Promise.resolve(healthCalls < 2 ? htmlResponse(503) : jsonResponse({ status: 'ok' }));
      }
      return Promise.resolve(htmlResponse());
    });
    vi.stubGlobal('fetch', fetchMock);
    const listener = vi.fn();
    const unsubscribe = subscribeServerWake(listener);

    const promise = ensureServerAwake();
    await vi.advanceTimersByTimeAsync(2_000);
    await promise;
    unsubscribe();

    expect(listener.mock.calls.map(([waking]) => waking)).toEqual([false, true, false]);
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

  it('api.post surfaces a 500 JSON error without retrying', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ message: 'Fallo interno' }, 500));
    vi.stubGlobal('fetch', fetchMock);

    await expect(api.post('/api/resource', { a: 1 })).rejects.toMatchObject({ status: 500, message: 'Fallo interno' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
