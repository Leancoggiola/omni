import { API_KEYS } from './keys';
import { ensureServerAwake, fetchWithWake } from './serverWake';

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

const fetchImpl = (impl: (url: string, init?: RequestInit) => Promise<unknown>) =>
  jest.fn(impl) as unknown as typeof fetch;

describe('serverWake (instancia mobile)', () => {
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

  it('hace polling al health contra la base de EXPO_PUBLIC_API_URL y reintenta el request original', async () => {
    let resourceCalls = 0;
    const fetchMock = fetchImpl((url: string) => {
      if (url === HEALTH) return Promise.resolve(jsonResponse({ status: 'ok' }));
      resourceCalls += 1;
      return Promise.resolve(resourceCalls === 1 ? htmlResponse() : jsonResponse({ done: true }));
    });
    global.fetch = fetchMock;

    const res = await fetchWithWake(RESOURCE, { method: 'POST' });

    expect(await res.json()).toEqual({ done: true });
    expect(fetchMock).toHaveBeenCalledWith(HEALTH, expect.anything());
  });

  it('pasado el tope lanza ApiError 503', async () => {
    global.fetch = fetchImpl(() => Promise.resolve(htmlResponse(502)));

    const assertion = expect(fetchWithWake(RESOURCE)).rejects.toMatchObject({ name: 'ApiError', status: 503 });
    await jest.advanceTimersByTimeAsync(95_000);
    await assertion;
  });

  it('sin EXPO_PUBLIC_API_URL ensureServerAwake devuelve false en vez de rechazar', async () => {
    delete process.env.EXPO_PUBLIC_API_URL;
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = ensureServerAwake();
    await jest.advanceTimersByTimeAsync(95_000);

    await expect(result).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
