import { API_KEYS } from './keys';
import { ensureServerAwake, fetchWithWake, subscribeServerWake } from './serverWake';

const BASE = 'http://api.test';
const HEALTH = `${BASE}${API_KEYS.health}`;
const RESOURCE = `${BASE}/api/resource`;

const jsonResponse = (body: unknown, status = 200) => ({
  ok: status < 400,
  status,
  headers: new Headers({ 'content-type': 'application/json' }),
  json: () => Promise.resolve(body),
});

const htmlResponse = (status = 502) => ({
  ok: false,
  status,
  headers: new Headers({ 'content-type': 'text/html' }),
  json: () => Promise.reject(new SyntaxError('Unexpected token <')),
});

const countCalls = (fetchMock: jest.Mock, url: string) =>
  fetchMock.mock.calls.filter(([calledUrl]) => calledUrl === url).length;

const fetchImpl = (impl: (url: string, init?: RequestInit) => Promise<unknown>) =>
  jest.fn(impl) as unknown as typeof fetch;

describe('fetchWithWake', () => {
  const originalFetch = global.fetch;
  const originalBase = process.env.EXPO_PUBLIC_API_URL;

  beforeEach(() => {
    jest.useFakeTimers();
    process.env.EXPO_PUBLIC_API_URL = BASE;
  });

  afterEach(() => {
    jest.useRealTimers();
    global.fetch = originalFetch;
    process.env.EXPO_PUBLIC_API_URL = originalBase;
  });

  it('devuelve la respuesta sin tocar cuando la API contesta JSON', async () => {
    const fetchMock = jest.fn().mockResolvedValue(jsonResponse({ ok: true }));
    global.fetch = fetchMock as unknown as typeof fetch;

    const res = await fetchWithWake(RESOURCE);

    expect(await res.json()).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('no reintenta un 500 JSON de la API', async () => {
    const fetchMock = jest.fn().mockResolvedValue(jsonResponse({ message: 'boom' }, 500));
    global.fetch = fetchMock as unknown as typeof fetch;

    const res = await fetchWithWake(RESOURCE, { method: 'POST' });

    expect(res.status).toBe(500);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('un 502 HTML hace polling al health y reintenta el request original', async () => {
    let healthCalls = 0;
    const fetchMock: jest.Mock = jest.fn((url: string) => {
      if (url === HEALTH) {
        healthCalls += 1;
        return Promise.resolve(healthCalls < 3 ? htmlResponse(503) : jsonResponse({ status: 'ok' }));
      }
      return Promise.resolve(countCalls(fetchMock, url) === 1 ? htmlResponse() : jsonResponse({ data: 1 }));
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const promise = fetchWithWake(RESOURCE, { method: 'POST' });
    await jest.advanceTimersByTimeAsync(2_000 + 4_000);
    const res = await promise;

    expect(await res.json()).toEqual({ data: 1 });
    expect(healthCalls).toBe(3);
    expect(countCalls(fetchMock, RESOURCE)).toBe(2);
  });

  it('un error de red también dispara el polling', async () => {
    let resourceCalls = 0;
    global.fetch = fetchImpl((url: string) => {
      if (url === HEALTH) return Promise.resolve(jsonResponse({ status: 'ok' }));
      resourceCalls += 1;
      return resourceCalls === 1
        ? Promise.reject(new TypeError('Network request failed'))
        : Promise.resolve(jsonResponse({ data: 2 }));
    });

    const res = await fetchWithWake(RESOURCE);

    expect(await res.json()).toEqual({ data: 2 });
  });

  it('no reintenta un POST ni un PATCH tras un error de red y lo propaga', async () => {
    for (const method of ['POST', 'PATCH']) {
      const fetchMock = jest.fn().mockRejectedValue(new TypeError('Network request failed'));
      global.fetch = fetchMock as unknown as typeof fetch;

      await expect(fetchWithWake(RESOURCE, { method })).rejects.toThrow('Network request failed');
      expect(fetchMock).toHaveBeenCalledTimes(1);
    }
  });

  it('reintenta un DELETE tras un error de red', async () => {
    let resourceCalls = 0;
    global.fetch = fetchImpl((url: string) => {
      if (url === HEALTH) return Promise.resolve(jsonResponse({ status: 'ok' }));
      resourceCalls += 1;
      return resourceCalls === 1
        ? Promise.reject(new TypeError('Network request failed'))
        : Promise.resolve(jsonResponse({ done: true }));
    });

    const res = await fetchWithWake(RESOURCE, { method: 'DELETE' });

    expect(await res.json()).toEqual({ done: true });
  });

  it('un POST con respuesta HTML del proxy sí se reintenta', async () => {
    let resourceCalls = 0;
    global.fetch = fetchImpl((url: string) => {
      if (url === HEALTH) return Promise.resolve(jsonResponse({ status: 'ok' }));
      resourceCalls += 1;
      return Promise.resolve(resourceCalls === 1 ? htmlResponse() : jsonResponse({ created: true }));
    });

    const res = await fetchWithWake(RESOURCE, { method: 'POST' });

    expect(await res.json()).toEqual({ created: true });
    expect(resourceCalls).toBe(2);
  });

  it('dos requests concurrentes comparten un solo polling', async () => {
    let healthCalls = 0;
    const served = new Set<string>();
    global.fetch = fetchImpl((url: string) => {
      if (url === HEALTH) {
        healthCalls += 1;
        return Promise.resolve(healthCalls < 2 ? htmlResponse(503) : jsonResponse({ status: 'ok' }));
      }
      if (!served.has(url)) {
        served.add(url);
        return Promise.resolve(htmlResponse());
      }
      return Promise.resolve(jsonResponse({ url }));
    });

    const a = fetchWithWake(`${BASE}/api/a`);
    const b = fetchWithWake(`${BASE}/api/b`);
    await jest.advanceTimersByTimeAsync(2_000);
    await Promise.all([a, b]);

    expect(healthCalls).toBe(2);
  });

  it('pasado el tope lanza ApiError 503', async () => {
    const fetchMock = jest.fn().mockResolvedValue(htmlResponse(502));
    global.fetch = fetchMock as unknown as typeof fetch;

    const assertion = expect(fetchWithWake(RESOURCE)).rejects.toMatchObject({
      name: 'ApiError',
      status: 503,
      message: 'El servidor no responde. Probá de nuevo en unos minutos.',
    });
    await jest.advanceTimersByTimeAsync(95_000);
    await assertion;

    expect(countCalls(fetchMock, RESOURCE)).toBe(1);
  });

  it('avisa a los suscriptores mientras despierta y al terminar', async () => {
    let healthCalls = 0;
    global.fetch = fetchImpl((url: string) => {
      if (url === HEALTH) {
        healthCalls += 1;
        return Promise.resolve(healthCalls < 2 ? htmlResponse(503) : jsonResponse({ status: 'ok' }));
      }
      return Promise.resolve(htmlResponse());
    });
    const listener = jest.fn();
    const unsubscribe = subscribeServerWake(listener);

    const promise = ensureServerAwake();
    await jest.advanceTimersByTimeAsync(2_000);
    await promise;
    unsubscribe();

    expect(listener.mock.calls.map(([waking]) => waking)).toEqual([false, true, false]);
  });
  it('muestra el aviso a los 1,5 s si el primer sondeo todavía no respondió', async () => {
    global.fetch = fetchImpl((url: string, init?: RequestInit) =>
      url === HEALTH
        ? new Promise((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
          })
        : Promise.resolve(htmlResponse())
    );
    const listener = jest.fn();
    const unsubscribe = subscribeServerWake(listener);

    const promise = ensureServerAwake();
    await jest.advanceTimersByTimeAsync(1_400);
    expect(listener.mock.calls.map(([waking]) => waking)).toEqual([false]);

    await jest.advanceTimersByTimeAsync(200);
    expect(listener.mock.calls.map(([waking]) => waking)).toEqual([false, true]);

    await jest.advanceTimersByTimeAsync(100_000);
    await promise;
    unsubscribe();

    expect(listener).toHaveBeenLastCalledWith(false);
  });

  it('no muestra el aviso si el primer sondeo responde enseguida', async () => {
    global.fetch = fetchImpl(() => Promise.resolve(jsonResponse({ status: 'ok' })));
    const listener = jest.fn();
    const unsubscribe = subscribeServerWake(listener);

    await ensureServerAwake();
    await jest.advanceTimersByTimeAsync(5_000);
    unsubscribe();

    expect(listener.mock.calls.map(([waking]) => waking)).toEqual([false]);
  });

  it('un 502 JSON de la API se devuelve tal cual, sin reintento', async () => {
    const fetchMock = jest.fn().mockResolvedValue(jsonResponse({ message: 'Error de Wikipedia' }, 502));
    global.fetch = fetchMock as unknown as typeof fetch;

    const res = await fetchWithWake(RESOURCE, { method: 'POST' });

    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ message: 'Error de Wikipedia' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('un 200 text/html del proxy hace polling y reintenta', async () => {
    let resourceCalls = 0;
    global.fetch = fetchImpl((url: string) => {
      if (url === HEALTH) return Promise.resolve(jsonResponse({ status: 'ok' }));
      resourceCalls += 1;
      return Promise.resolve(
        resourceCalls === 1
          ? { ok: true, status: 200, headers: new Headers({ 'content-type': 'text/html; charset=utf-8' }) }
          : jsonResponse({ done: true })
      );
    });

    const res = await fetchWithWake(RESOURCE);

    expect(await res.json()).toEqual({ done: true });
    expect(resourceCalls).toBe(2);
  });

  it('devuelve tal cual lo que no es del proxy (404 texto, 304) y reintenta un 502 text/plain', async () => {
    const plain = { ok: false, status: 404, headers: new Headers({ 'content-type': 'text/plain' }) };
    global.fetch = fetchImpl(() => Promise.resolve(plain));
    expect((await fetchWithWake(RESOURCE, { method: 'POST' })).status).toBe(404);

    const notModified = { ok: false, status: 304, headers: new Headers() };
    global.fetch = fetchImpl(() => Promise.resolve(notModified));
    expect((await fetchWithWake(RESOURCE)).status).toBe(304);

    let resourceCalls = 0;
    global.fetch = fetchImpl((url: string) => {
      if (url === HEALTH) return Promise.resolve(jsonResponse({ status: 'ok' }));
      resourceCalls += 1;
      return Promise.resolve(
        resourceCalls === 1
          ? { ok: false, status: 502, headers: new Headers({ 'content-type': 'text/plain' }) }
          : jsonResponse({ done: true })
      );
    });
    expect((await fetchWithWake(RESOURCE)).status).toBe(200);
    expect(resourceCalls).toBe(2);
  });
});
