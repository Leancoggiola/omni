import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { api } from '../client';
import { fetcher } from '../fetcher';
import { SWR_KEYS } from '../keys';
import { ensureRefreshed } from '../refreshSession';
import { ensureServerAwake, fetchWithWake, subscribeServerWake } from '../serverWake';

import {
  createServerWake,
  SERVER_GATEWAY_TIMEOUT_MESSAGE,
  SERVER_MUTATION_TIMEOUT_MS,
  SERVER_REQUEST_TIMEOUT_MS,
  SERVER_TIMEOUT_MESSAGE,
  SERVER_TIMEOUT_STATUS,
} from '@omni/shared/server-wake';

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
  let startedAt = 0;

  beforeEach(() => {
    vi.useFakeTimers();
    startedAt = Date.now();
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

  it.each([
    ['a 404 with text/plain', 404, 'text/plain'],
    ['a 401 with text/plain', 401, 'text/plain; charset=utf-8'],
    ['a 304 without content-type', 304, null],
    ['a 302 redirect without content-type', 302, null],
    ['a 429 JSON', 429, 'application/json'],
    ['a 502 JSON from the API', 502, 'application/json'],
    ['a 504 JSON from the API', 504, 'application/json; charset=utf-8'],
  ])('returns %s untouched, it is not a proxy response', async (_label, status, contentType) => {
    const headers = contentType ? new Headers({ 'content-type': contentType }) : new Headers();
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status, headers });
    vi.stubGlobal('fetch', fetchMock);

    const res = await fetchWithWake('/api/resource', { method: 'POST' });

    expect(res.status).toBe(status);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['a 502 with a non-HTML body', 502, 'text/plain'],
    ['a 503 without content-type', 503, null],
    ['a 502 with text/plain', 502, 'text/plain; charset=utf-8'],
    ['a 200 with HTML', 200, 'text/html; charset=utf-8'],
    ['a 404 with HTML', 404, 'text/html'],
  ])('treats %s as a proxy response and polls health', async (_label, status, contentType) => {
    let resourceCalls = 0;
    const platform = {
      ok: status < 400,
      status,
      headers: contentType ? new Headers({ 'content-type': contentType }) : new Headers(),
    };
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url === SWR_KEYS.health) return Promise.resolve(jsonResponse({ status: 'ok' }));
        resourceCalls += 1;
        return Promise.resolve(resourceCalls === 1 ? platform : jsonResponse({ done: true }));
      })
    );

    const res = await fetchWithWake('/api/resource');

    expect(await res.json()).toEqual({ done: true });
    expect(resourceCalls).toBe(2);
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

  it('does not retry a POST after a network error and propagates it', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchWithWake('/api/resource', { method: 'POST' })).rejects.toThrow('Failed to fetch');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not retry a PATCH after a network error', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchWithWake('/api/resource', { method: 'patch' })).rejects.toThrow('Failed to fetch');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries a PUT and a DELETE after a network error', async () => {
    for (const method of ['PUT', 'DELETE']) {
      let resourceCalls = 0;
      vi.stubGlobal(
        'fetch',
        vi.fn((url: string) => {
          if (url === SWR_KEYS.health) return Promise.resolve(jsonResponse({ status: 'ok' }));
          resourceCalls += 1;
          return resourceCalls === 1
            ? Promise.reject(new TypeError('Failed to fetch'))
            : Promise.resolve(jsonResponse({ done: true }));
        })
      );

      const res = await fetchWithWake('/api/resource', { method });

      expect(await res.json()).toEqual({ done: true });
    }
  });

  it('still retries a POST when the proxy answered with HTML', async () => {
    let resourceCalls = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url === SWR_KEYS.health) return Promise.resolve(jsonResponse({ status: 'ok' }));
        resourceCalls += 1;
        return Promise.resolve(resourceCalls === 1 ? htmlResponse() : jsonResponse({ created: true }));
      })
    );

    const res = await fetchWithWake('/api/resource', { method: 'POST' });

    expect(await res.json()).toEqual({ created: true });
    expect(resourceCalls).toBe(2);
  });

  it.each(['POST', 'PATCH'])('still retries a %s after a proxy 503', async method => {
    let resourceCalls = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url === SWR_KEYS.health) return Promise.resolve(jsonResponse({ status: 'ok' }));
        resourceCalls += 1;
        return Promise.resolve(resourceCalls === 1 ? htmlResponse(503) : jsonResponse({ saved: true }));
      })
    );

    const res = await fetchWithWake('/api/resource', { method });

    expect(await res.json()).toEqual({ saved: true });
    expect(resourceCalls).toBe(2);
  });

  it.each(['POST', 'patch'])('does not retry a %s after a proxy 504 and throws the timeout ApiError', async method => {
    const fetchMock = vi.fn().mockResolvedValue(htmlResponse(504));
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchWithWake('/api/resource', { method })).rejects.toMatchObject({
      name: 'ApiError',
      status: 504,
      message: SERVER_GATEWAY_TIMEOUT_MESSAGE,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries a POST marked as idempotent after a proxy 504', async () => {
    let resourceCalls = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url === SWR_KEYS.health) return Promise.resolve(jsonResponse({ status: 'ok' }));
        resourceCalls += 1;
        return Promise.resolve(resourceCalls === 1 ? htmlResponse(504) : jsonResponse({ renewed: true }));
      })
    );

    const res = await fetchWithWake('/api/resource', { method: 'POST' }, { idempotent: true });

    expect(await res.json()).toEqual({ renewed: true });
    expect(resourceCalls).toBe(2);
  });

  it('still retries a GET after a proxy 504', async () => {
    let resourceCalls = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url === SWR_KEYS.health) return Promise.resolve(jsonResponse({ status: 'ok' }));
        resourceCalls += 1;
        return Promise.resolve(resourceCalls === 1 ? htmlResponse(504) : jsonResponse({ list: [] }));
      })
    );

    const res = await fetchWithWake('/api/resource');

    expect(await res.json()).toEqual({ list: [] });
    expect(resourceCalls).toBe(2);
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

  it('gives up with the original error and no notice after two consecutive network errors on the probe', async () => {
    const networkError = new TypeError('Failed to fetch');
    const fetchMock = vi.fn().mockRejectedValue(networkError);
    vi.stubGlobal('fetch', fetchMock);
    const listener = vi.fn();
    const unsubscribe = subscribeServerWake(listener);

    const promise = fetchWithWake('/api/resource');
    const assertion = expect(promise).rejects.toBe(networkError);
    await vi.advanceTimersByTimeAsync(2_000);
    await assertion;
    unsubscribe();

    expect(countCalls(fetchMock, '/api/resource')).toBe(1);
    expect(countCalls(fetchMock, SWR_KEYS.health)).toBe(2);
    expect(listener.mock.calls.map(([waking]) => waking)).toEqual([false]);
  });

  it('does not give up after a single network error on the probe', async () => {
    let healthCalls = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url !== SWR_KEYS.health) return Promise.reject(new TypeError('Failed to fetch'));
        healthCalls += 1;
        return healthCalls === 1
          ? Promise.reject(new TypeError('Failed to fetch'))
          : Promise.resolve(jsonResponse({ status: 'ok' }));
      })
    );

    const promise = ensureServerAwake();
    await vi.advanceTimersByTimeAsync(2_000);

    await expect(promise).resolves.toBe(true);
    expect(healthCalls).toBe(2);
  });

  it('cuts straight away without probing when the browser reports it is offline', async () => {
    const networkError = new TypeError('Failed to fetch');
    const fetchMock = vi.fn().mockRejectedValue(networkError);
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('navigator', { onLine: false });
    const listener = vi.fn();
    const unsubscribe = subscribeServerWake(listener);

    await expect(fetchWithWake('/api/resource')).rejects.toBe(networkError);
    unsubscribe();

    expect(countCalls(fetchMock, SWR_KEYS.health)).toBe(0);
    expect(listener.mock.calls.map(([waking]) => waking)).toEqual([false]);
  });

  it('caps the total wait at 90 s: the last probe is bounded and there is no extra probe', async () => {
    const probeSignals: AbortSignal[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string, init?: RequestInit) => {
        if (url !== SWR_KEYS.health) return Promise.resolve(htmlResponse());
        const signal = init?.signal as AbortSignal;
        probeSignals.push(signal);
        return new Promise((_resolve, reject) => {
          signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
        });
      })
    );

    const result = ensureServerAwake();
    await vi.advanceTimersByTimeAsync(90_000);

    await expect(result).resolves.toBe(false);
    expect(Date.now() - startedAt).toBeLessThanOrEqual(90_000);
    expect(probeSignals.every(signal => signal.aborted)).toBe(true);
  });

  it('stops waiting for the polling and rethrows the abort when the caller aborts the request', async () => {
    const controller = new AbortController();
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string, init?: RequestInit) => {
        if (url !== SWR_KEYS.health) return Promise.reject(new TypeError('Failed to fetch'));
        return new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
        });
      })
    );

    const promise = fetchWithWake('/api/resource', { signal: controller.signal });
    const assertion = expect(promise).rejects.toMatchObject({ name: 'AbortError' });
    await vi.advanceTimersByTimeAsync(1_000);
    controller.abort();
    await assertion;
    await vi.advanceTimersByTimeAsync(100_000);
  });

  it('rethrows an AbortError without DOMException when the signal has no reason', async () => {
    vi.stubGlobal('DOMException', undefined);
    let onAbort: (() => void) | undefined;
    const signal = {
      aborted: false,
      reason: undefined,
      addEventListener: (_type: string, listener: () => void) => {
        onAbort = listener;
      },
      removeEventListener: () => undefined,
    } as unknown as AbortSignal;
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) =>
        url === SWR_KEYS.health ? Promise.resolve(htmlResponse(503)) : Promise.reject(new TypeError('Failed to fetch'))
      )
    );

    const promise = fetchWithWake('/api/resource', { signal });
    const assertion = expect(promise).rejects.toMatchObject({
      name: 'AbortError',
      message: 'The operation was aborted.',
    });
    await vi.advanceTimersByTimeAsync(1_000);
    onAbort?.();
    await assertion;
    await vi.advanceTimersByTimeAsync(100_000);
  });

  it('keeps the shared polling alive for other callers when one of them aborts', async () => {
    const controller = new AbortController();
    let healthCalls = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url === SWR_KEYS.health) {
          healthCalls += 1;
          return Promise.resolve(healthCalls < 2 ? htmlResponse(503) : jsonResponse({ status: 'ok' }));
        }
        return Promise.resolve(htmlResponse());
      })
    );

    const aborted = fetchWithWake('/api/a', { signal: controller.signal });
    const abortedAssertion = expect(aborted).rejects.toMatchObject({ name: 'AbortError' });
    const other = ensureServerAwake();
    await vi.advanceTimersByTimeAsync(500);
    controller.abort();
    await abortedAssertion;
    await vi.advanceTimersByTimeAsync(2_000);

    await expect(other).resolves.toBe(true);
  });

  it('keeps polling when a GET network error is followed by a proxy 502 on the probe', async () => {
    let healthCalls = 0;
    let resourceCalls = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url === SWR_KEYS.health) {
          healthCalls += 1;
          return Promise.resolve(healthCalls < 3 ? htmlResponse(502) : jsonResponse({ status: 'ok' }));
        }
        resourceCalls += 1;
        return resourceCalls === 1
          ? Promise.reject(new TypeError('Failed to fetch'))
          : Promise.resolve(jsonResponse({ data: 3 }));
      })
    );

    const promise = fetchWithWake('/api/resource');
    await vi.advanceTimersByTimeAsync(2_000 + 4_000);
    const res = await promise;

    expect(await res.json()).toEqual({ data: 3 });
    expect(healthCalls).toBe(3);
  });

  it('keeps polling when the probe network-errors after the proxy already answered', async () => {
    let healthCalls = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url !== SWR_KEYS.health) return Promise.resolve(htmlResponse());
        healthCalls += 1;
        if (healthCalls === 1) return Promise.resolve(htmlResponse(503));
        if (healthCalls === 2) return Promise.reject(new TypeError('Failed to fetch'));
        return Promise.resolve(jsonResponse({ status: 'ok' }));
      })
    );

    const promise = ensureServerAwake();
    await vi.advanceTimersByTimeAsync(2_000 + 4_000);

    await expect(promise).resolves.toBe(true);
    expect(healthCalls).toBe(3);
  });

  it('shows the notice after 1.5 s when the first probe has not answered yet', async () => {
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (url !== SWR_KEYS.health) return Promise.resolve(htmlResponse());
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
      });
    });
    vi.stubGlobal('fetch', fetchMock);
    const listener = vi.fn();
    const unsubscribe = subscribeServerWake(listener);

    const promise = ensureServerAwake();
    await vi.advanceTimersByTimeAsync(1_400);
    expect(listener.mock.calls.map(([waking]) => waking)).toEqual([false]);

    await vi.advanceTimersByTimeAsync(200);
    expect(listener.mock.calls.map(([waking]) => waking)).toEqual([false, true]);

    await vi.advanceTimersByTimeAsync(100_000);
    await promise;
    unsubscribe();

    expect(listener).toHaveBeenLastCalledWith(false);
  });

  it('never shows the notice when the first probe answers right away', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ status: 'ok' })));
    const listener = vi.fn();
    const unsubscribe = subscribeServerWake(listener);

    await ensureServerAwake();
    await vi.advanceTimersByTimeAsync(5_000);
    unsubscribe();

    expect(listener.mock.calls.map(([waking]) => waking)).toEqual([false]);
  });

  it('shows the notice as soon as the first probe fails, without waiting 1.5 s', async () => {
    let healthCalls = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(() => {
        healthCalls += 1;
        return Promise.resolve(healthCalls < 2 ? htmlResponse(503) : jsonResponse({ status: 'ok' }));
      })
    );
    const listener = vi.fn();
    const unsubscribe = subscribeServerWake(listener);

    const promise = ensureServerAwake();
    await vi.advanceTimersByTimeAsync(0);
    expect(listener.mock.calls.map(([waking]) => waking)).toEqual([false, true]);

    await vi.advanceTimersByTimeAsync(2_000);
    await promise;
    unsubscribe();
  });
});

describe('fetchWithWake request timeout', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  const hangUntilAborted = (init?: RequestInit) =>
    new Promise<never>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
    });

  it('aborts a hung POST after 100 s with an ApiError of status 0, without retrying', async () => {
    const signals: AbortSignal[] = [];
    const fetchMock = vi.fn((_url: string, init?: RequestInit) => {
      if (init?.signal) signals.push(init.signal);
      return hangUntilAborted(init);
    });
    vi.stubGlobal('fetch', fetchMock);

    const promise = fetchWithWake('/api/resource', { method: 'POST' });
    const assertion = expect(promise).rejects.toMatchObject({
      name: 'ApiError',
      status: SERVER_TIMEOUT_STATUS,
      message: SERVER_TIMEOUT_MESSAGE,
    });
    await vi.advanceTimersByTimeAsync(SERVER_MUTATION_TIMEOUT_MS);
    await assertion;

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(signals[0]?.aborted).toBe(true);
  });

  it('does not cut a GET before 30 s', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise(resolve => {
            setTimeout(() => resolve(jsonResponse({ slow: true })), SERVER_REQUEST_TIMEOUT_MS - 1);
          })
      )
    );

    const promise = fetchWithWake('/api/resource');
    await vi.advanceTimersByTimeAsync(SERVER_REQUEST_TIMEOUT_MS - 1);
    const res = await promise;

    expect(await res.json()).toEqual({ slow: true });
    expect(vi.getTimerCount()).toBe(0);
  });

  it('waits past 30 s for a POST held by a cold start, and cuts it only at 100 s', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise(resolve => {
            setTimeout(() => resolve(jsonResponse({ logged: true })), 60_000);
          })
      )
    );

    const promise = fetchWithWake('/api/auth/login', { method: 'POST' });
    await vi.advanceTimersByTimeAsync(60_000);
    const res = await promise;

    expect(await res.json()).toEqual({ logged: true });
    expect(SERVER_MUTATION_TIMEOUT_MS).toBeGreaterThan(60_000);
    expect(SERVER_MUTATION_TIMEOUT_MS).toBeLessThan(120_000);
  });

  it('cuts a POST marked as idempotent at 30 s and retries it after polling health', async () => {
    let resourceCalls = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string, init?: RequestInit) => {
        if (url === SWR_KEYS.health) return Promise.resolve(jsonResponse({ status: 'ok' }));
        resourceCalls += 1;
        return resourceCalls === 1 ? hangUntilAborted(init) : Promise.resolve(jsonResponse({ renewed: true }));
      })
    );

    const promise = fetchWithWake('/api/resource', { method: 'POST' }, { idempotent: true });
    await vi.advanceTimersByTimeAsync(SERVER_REQUEST_TIMEOUT_MS);
    const res = await promise;

    expect(await res.json()).toEqual({ renewed: true });
    expect(resourceCalls).toBe(2);
  });

  it('cuts the request even when fetch ignores the abort signal', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise(() => undefined))
    );

    const promise = fetchWithWake('/api/resource', { method: 'PATCH' });
    const assertion = expect(promise).rejects.toMatchObject({ status: SERVER_TIMEOUT_STATUS });
    await vi.advanceTimersByTimeAsync(SERVER_MUTATION_TIMEOUT_MS);
    await assertion;
  });

  it('treats a hung GET like a network error: polls health and retries', async () => {
    let resourceCalls = 0;
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (url === SWR_KEYS.health) return Promise.resolve(jsonResponse({ status: 'ok' }));
      resourceCalls += 1;
      return resourceCalls === 1 ? hangUntilAborted(init) : Promise.resolve(jsonResponse({ data: 3 }));
    });
    vi.stubGlobal('fetch', fetchMock);

    const promise = fetchWithWake('/api/resource');
    await vi.advanceTimersByTimeAsync(SERVER_REQUEST_TIMEOUT_MS);
    const res = await promise;

    expect(await res.json()).toEqual({ data: 3 });
    expect(countCalls(fetchMock, SWR_KEYS.health)).toBe(1);
    expect(resourceCalls).toBe(2);
  });

  it('rethrows the timeout ApiError when a hung GET is followed by offline probes', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string, init?: RequestInit) =>
        url === SWR_KEYS.health ? Promise.reject(new TypeError('Failed to fetch')) : hangUntilAborted(init)
      )
    );

    const promise = fetchWithWake('/api/resource');
    const assertion = expect(promise).rejects.toMatchObject({ name: 'ApiError', status: SERVER_TIMEOUT_STATUS });
    await vi.advanceTimersByTimeAsync(SERVER_REQUEST_TIMEOUT_MS + 2_000);
    await assertion;
  });

  it('rethrows the caller abort, not the timeout, when the caller aborts a hung request', async () => {
    const controller = new AbortController();
    const signals: AbortSignal[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string, init?: RequestInit) => {
        if (init?.signal) signals.push(init.signal);
        return hangUntilAborted(init);
      })
    );

    const promise = fetchWithWake('/api/resource', { signal: controller.signal });
    const assertion = expect(promise).rejects.toMatchObject({ name: 'AbortError' });
    await vi.advanceTimersByTimeAsync(1_000);
    controller.abort();
    await assertion;

    expect(signals[0]?.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('keeps the caller abort wired after the headers, so it still cuts reading the body', async () => {
    const controller = new AbortController();
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string, init?: RequestInit) =>
        Promise.resolve({
          ok: true,
          status: 200,
          headers: JSON_HEADERS,
          json: () => hangUntilAborted(init),
        })
      )
    );

    const res = await fetchWithWake('/api/resource', { signal: controller.signal });
    const body = res.json();
    const assertion = expect(body).rejects.toMatchObject({ name: 'AbortError' });
    controller.abort();
    await assertion;
  });

  it('passes an already aborted caller signal through to fetch', async () => {
    const controller = new AbortController();
    controller.abort();
    const fetchMock = vi.fn((_url: string, init?: RequestInit) =>
      init?.signal?.aborted
        ? Promise.reject(new DOMException('aborted', 'AbortError'))
        : Promise.resolve(jsonResponse({ ok: true }))
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchWithWake('/api/resource', { signal: controller.signal })).rejects.toMatchObject({
      name: 'AbortError',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('createServerWake', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('ensureServerAwake resolves false instead of rejecting when healthUrl throws', async () => {
    const fetchMock = vi.fn();
    const wake = createServerWake({
      fetch: fetchMock,
      healthUrl: () => {
        throw new Error('EXPO_PUBLIC_API_URL no está definida');
      },
      createError: (message, status) => new Error(`${status}: ${message}`),
    });

    const result = wake.ensureServerAwake();
    await vi.advanceTimersByTimeAsync(95_000);

    await expect(result).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('fetchWithWake throws the injected 503 error when healthUrl is misconfigured', async () => {
    const wake = createServerWake({
      fetch: vi.fn().mockResolvedValue(htmlResponse(502)),
      healthUrl: () => {
        throw new Error('sin base URL');
      },
      createError: (message, status) => new Error(`${status}: ${message}`),
    });

    const promise = wake.fetchWithWake('/api/resource');
    const assertion = expect(promise).rejects.toThrow('503: El servidor no responde');
    await vi.advanceTimersByTimeAsync(95_000);
    await assertion;
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
    let refreshCalls = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url === SWR_KEYS.health) return Promise.resolve(jsonResponse({ status: 'ok' }));
        refreshCalls += 1;
        return Promise.resolve(refreshCalls === 1 ? htmlResponse(504) : jsonResponse({ ok: true }));
      })
    );

    await expect(ensureRefreshed()).resolves.toBe(true);
    expect(refreshCalls).toBe(2);
  });

  it('api.post surfaces a 500 JSON error without retrying', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ message: 'Fallo interno' }, 500));
    vi.stubGlobal('fetch', fetchMock);

    await expect(api.post('/api/resource', { a: 1 })).rejects.toMatchObject({ status: 500, message: 'Fallo interno' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
