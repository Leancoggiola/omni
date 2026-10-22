import { afterEach, describe, expect, it, vi } from 'vitest';

import { api, clearOnAuthFailure, fetcher, setOnAuthFailure } from '../client';
import { SWR_KEYS } from '../keys';

const JSON_HEADERS = new Headers({ 'content-type': 'application/json' });

const jsonResponse = (body: unknown, status = 200) => ({
  ok: status < 400,
  status,
  statusText: '',
  headers: JSON_HEADERS,
  json: () => Promise.resolve(body),
});

type Route = (init: RequestInit) => ReturnType<typeof jsonResponse>;

const stubApi = (routes: Record<string, Route>) => {
  const fetchMock = vi.fn((url: string, init: RequestInit = {}) =>
    Promise.resolve(routes[url]?.(init) ?? jsonResponse({ message: 'Not found' }, 404))
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};

describe('client web (cableado de createApiClient)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    clearOnAuthFailure();
  });

  it('fetcher y api mandan la cookie de sesión al path sin base', async () => {
    const fetchMock = stubApi({
      '/api/media/list': () => jsonResponse([]),
      '/api/resource': () => jsonResponse({ ok: true }),
    });

    await expect(fetcher('/api/media/list')).resolves.toEqual([]);
    await expect(api.post('/api/resource', { a: 1 })).resolves.toEqual({ ok: true });

    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: 'GET', credentials: 'include' });
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({ method: 'POST', credentials: 'include', body: '{"a":1}' });
  });

  it('ante un 401 refresca con un POST con cookie y reintenta', async () => {
    let resourceCalls = 0;
    const fetchMock = stubApi({
      [SWR_KEYS.auth.refresh]: () => jsonResponse({}),
      '/api/resource': () => (++resourceCalls === 1 ? jsonResponse({ message: 'No' }, 401) : jsonResponse({ ok: 1 })),
    });

    await expect(api.patch('/api/resource', {})).resolves.toEqual({ ok: 1 });

    const urls = fetchMock.mock.calls.map(([url]) => url);
    expect(urls).toEqual(['/api/resource', SWR_KEYS.auth.refresh, '/api/resource']);
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({ method: 'POST', credentials: 'include', body: '{}' });
  });

  it.each([401, 403])('un refresh con %i avisa a setOnAuthFailure una sola vez', async status => {
    const onAuthFailure = vi.fn();
    setOnAuthFailure(onAuthFailure);
    stubApi({
      [SWR_KEYS.auth.refresh]: () => jsonResponse({ message: 'Sesión inválida' }, status),
      '/api/a': () => jsonResponse({ message: 'No' }, 401),
      '/api/b': () => jsonResponse({ message: 'No' }, 401),
    });

    const results = await Promise.allSettled([fetcher('/api/a'), fetcher('/api/b')]);

    expect(results.map(r => r.status)).toEqual(['rejected', 'rejected']);
    expect(onAuthFailure).toHaveBeenCalledTimes(1);
  });

  it.each([429, 500])('un refresh con %i propaga su ApiError y no cierra la sesión', async status => {
    const onAuthFailure = vi.fn();
    setOnAuthFailure(onAuthFailure);
    stubApi({
      [SWR_KEYS.auth.refresh]: () => jsonResponse({ message: 'Intentá más tarde' }, status),
      '/api/resource': () => jsonResponse({ message: 'No' }, 401),
    });

    await expect(fetcher('/api/resource')).rejects.toMatchObject({
      name: 'ApiError',
      status,
      message: 'Intentá más tarde',
    });
    expect(onAuthFailure).not.toHaveBeenCalled();
  });

  it('clearOnAuthFailure deja de avisar', async () => {
    const onAuthFailure = vi.fn();
    setOnAuthFailure(onAuthFailure);
    clearOnAuthFailure();
    stubApi({
      [SWR_KEYS.auth.refresh]: () => jsonResponse({}, 401),
      '/api/resource': () => jsonResponse({ message: 'No' }, 401),
    });

    await expect(fetcher('/api/resource')).rejects.toMatchObject({ status: 401 });
    expect(onAuthFailure).not.toHaveBeenCalled();
  });
});
