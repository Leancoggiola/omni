import { describe, expect, it, vi } from 'vitest';

import { API_PATHS, createApiClient } from '..';

import type { ApiClientOptions } from '..';

type FetchMock = ReturnType<typeof vi.fn<ApiClientOptions['fetch']>>;

const jsonResponse = (body: unknown, status = 200) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 401 ? 'Unauthorized' : '',
    json: () => Promise.resolve(body),
  }) as Response;

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const flush = async () => {
  for (let i = 0; i < 20; i++) await Promise.resolve();
};

const initOf = (fetchMock: FetchMock, call = 0) => fetchMock.mock.calls[call]?.[1] as RequestInit;
const headersOf = (fetchMock: FetchMock, call = 0) => initOf(fetchMock, call).headers as Record<string, string>;

describe('createApiClient', () => {
  describe('request', () => {
    it('manda JSON con credentials y la URL de toUrl, y devuelve el body', async () => {
      const fetchMock: FetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));
      const client = createApiClient({
        fetch: fetchMock,
        toUrl: path => `http://api.test${path}`,
        credentials: 'include',
        refresh: vi.fn(),
      });

      await expect(client.post('/api/resource', { a: 1 })).resolves.toEqual({ ok: true });

      expect(fetchMock).toHaveBeenCalledWith('http://api.test/api/resource', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: '{"a":1}',
      });
    });

    it('un GET va sin Content-Type ni body; fetcher es el mismo GET', async () => {
      const fetchMock: FetchMock = vi.fn().mockResolvedValue(jsonResponse([1]));
      const client = createApiClient({ fetch: fetchMock, refresh: vi.fn() });

      await expect(client.fetcher('/api/list')).resolves.toEqual([1]);

      expect(initOf(fetchMock)).toMatchObject({ method: 'GET', headers: {}, body: undefined });
    });

    it('suma los headers de auth a cada request', async () => {
      const fetchMock: FetchMock = vi.fn().mockResolvedValue(jsonResponse({}));
      const client = createApiClient({
        fetch: fetchMock,
        getAuthHeaders: async () => ({ Authorization: 'Bearer a1' }),
        refresh: vi.fn(),
      });

      await client.delete('/api/resource/1');

      expect(headersOf(fetchMock)).toEqual({ 'Content-Type': 'application/json', Authorization: 'Bearer a1' });
    });

    it('devuelve undefined ante un 204', async () => {
      const fetchMock: FetchMock = vi.fn().mockResolvedValue({ ok: true, status: 204 } as Response);
      const client = createApiClient({ fetch: fetchMock, refresh: vi.fn() });

      await expect(client.delete('/api/resource/1')).resolves.toBeUndefined();
    });

    it('lanza ApiError con el mensaje del body, o el statusText si no trae', async () => {
      const fetchMock: FetchMock = vi
        .fn()
        .mockResolvedValueOnce(jsonResponse({ message: 'Datos inválidos' }, 400))
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          json: () => Promise.reject(new SyntaxError('Unexpected token')),
        } as Response);
      const client = createApiClient({ fetch: fetchMock, refresh: vi.fn() });

      await expect(client.patch('/api/resource', {})).rejects.toMatchObject({
        name: 'ApiError',
        message: 'Datos inválidos',
        status: 400,
        info: { message: 'Datos inválidos' },
      });
      await expect(client.get('/api/resource')).rejects.toMatchObject({
        message: 'Internal Server Error',
        status: 500,
      });
    });
  });

  describe('401 sin headers de auth (cookies)', () => {
    it('refresca y reintenta una vez', async () => {
      const fetchMock: FetchMock = vi
        .fn()
        .mockResolvedValueOnce(jsonResponse({ message: 'No' }, 401))
        .mockResolvedValueOnce(jsonResponse({ ok: true }));
      const refresh = vi.fn().mockResolvedValue(true);
      const client = createApiClient({ fetch: fetchMock, refresh });

      await expect(client.get('/api/resource')).resolves.toEqual({ ok: true });

      expect(refresh).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('si el reintento vuelve a dar 401 lanza ese 401 sin refrescar de nuevo', async () => {
      const fetchMock: FetchMock = vi.fn().mockResolvedValue(jsonResponse({ message: 'Usuario no encontrado' }, 401));
      const refresh = vi.fn().mockResolvedValue(true);
      const client = createApiClient({ fetch: fetchMock, refresh });

      await expect(client.get('/api/resource')).rejects.toMatchObject({ status: 401 });

      expect(refresh).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('varios 401 simultáneos comparten un solo refresh', async () => {
      const gate = deferred<boolean>();
      let calls = 0;
      const fetchMock: FetchMock = vi.fn(async () =>
        ++calls <= 3 ? jsonResponse({ message: 'No' }, 401) : jsonResponse({ ok: true })
      );
      const refresh = vi.fn(() => gate.promise);
      const client = createApiClient({ fetch: fetchMock, refresh });

      const requests = Promise.all([client.get('/api/a'), client.get('/api/b'), client.post('/api/c')]);
      await flush();
      gate.resolve(true);

      await expect(requests).resolves.toHaveLength(3);
      expect(refresh).toHaveBeenCalledTimes(1);
    });

    it('un refresh que devuelve false avisa onAuthFailure una sola vez y cada request lanza su 401', async () => {
      const fetchMock: FetchMock = vi.fn().mockResolvedValue(jsonResponse({ message: 'No' }, 401));
      const onAuthFailure = vi.fn();
      const client = createApiClient({ fetch: fetchMock, refresh: vi.fn().mockResolvedValue(false), onAuthFailure });

      const results = await Promise.allSettled([client.get('/api/a'), client.get('/api/b')]);

      expect(results.map(r => r.status)).toEqual(['rejected', 'rejected']);
      expect(results[0]).toMatchObject({ reason: { status: 401 } });
      expect(onAuthFailure).toHaveBeenCalledTimes(1);
    });

    it('un refresh que lanza propaga su error a todos los que esperan, sin avisar onAuthFailure', async () => {
      const fetchMock: FetchMock = vi.fn().mockResolvedValue(jsonResponse({ message: 'No' }, 401));
      const refreshError = new Error('refresh 503');
      const onAuthFailure = vi.fn();
      const client = createApiClient({
        fetch: fetchMock,
        refresh: vi.fn().mockRejectedValue(refreshError),
        onAuthFailure,
      });

      const results = await Promise.allSettled([client.get('/api/a'), client.get('/api/b')]);

      expect(results).toEqual([
        { status: 'rejected', reason: refreshError },
        { status: 'rejected', reason: refreshError },
      ]);
      expect(onAuthFailure).not.toHaveBeenCalled();
    });

    it('después de un refresh fallido el próximo 401 vuelve a refrescar', async () => {
      const fetchMock: FetchMock = vi.fn().mockResolvedValue(jsonResponse({ message: 'No' }, 401));
      const refresh = vi.fn().mockRejectedValueOnce(new Error('red')).mockResolvedValueOnce(false);
      const client = createApiClient({ fetch: fetchMock, refresh });

      await expect(client.get('/api/a')).rejects.toThrow('red');
      await expect(client.get('/api/a')).rejects.toMatchObject({ status: 401 });

      expect(refresh).toHaveBeenCalledTimes(2);
    });

    it.each([API_PATHS.auth.login, API_PATHS.auth.logout, API_PATHS.auth.refresh])(
      'no refresca ante el 401 de %s',
      async path => {
        const fetchMock: FetchMock = vi
          .fn()
          .mockResolvedValue(jsonResponse({ message: 'Credenciales inválidas' }, 401));
        const refresh = vi.fn();
        const client = createApiClient({ fetch: fetchMock, refresh });

        await expect(client.post(path)).rejects.toMatchObject({ status: 401, message: 'Credenciales inválidas' });

        expect(refresh).not.toHaveBeenCalled();
      }
    );
  });

  describe('401 con headers de auth (Bearer)', () => {
    it('si los headers siguen iguales refresca y reintenta con los nuevos', async () => {
      let token = 'a1';
      const fetchMock: FetchMock = vi.fn(async (_url, init) =>
        (init.headers as Record<string, string>).Authorization === 'Bearer a2'
          ? jsonResponse({ ok: true })
          : jsonResponse({ message: 'No' }, 401)
      );
      const refresh = vi.fn(async () => {
        token = 'a2';
        return true;
      });
      const client = createApiClient({
        fetch: fetchMock,
        getAuthHeaders: async () => ({ Authorization: `Bearer ${token}` }),
        refresh,
      });

      await expect(client.get('/api/resource')).resolves.toEqual({ ok: true });

      expect(refresh).toHaveBeenCalledTimes(1);
      expect(headersOf(fetchMock, 1).Authorization).toBe('Bearer a2');
    });

    it('si los headers cambiaron desde que salió el request reintenta sin refrescar', async () => {
      let token = 'a1';
      const fetchMock: FetchMock = vi.fn(async () => {
        if (token === 'a1') {
          token = 'a2';
          return jsonResponse({ message: 'No' }, 401);
        }
        return jsonResponse({ ok: true });
      });
      const refresh = vi.fn();
      const client = createApiClient({
        fetch: fetchMock,
        getAuthHeaders: async () => ({ Authorization: `Bearer ${token}` }),
        refresh,
      });

      await expect(client.get('/api/resource')).resolves.toEqual({ ok: true });

      expect(refresh).not.toHaveBeenCalled();
    });

    it('si ya no hay sesión no refresca ni avisa, y lanza el 401', async () => {
      let headers: Record<string, string> | null = { Authorization: 'Bearer a1' };
      const fetchMock: FetchMock = vi.fn(async () => {
        headers = null;
        return jsonResponse({ message: 'No' }, 401);
      });
      const refresh = vi.fn();
      const onAuthFailure = vi.fn();
      const client = createApiClient({ fetch: fetchMock, getAuthHeaders: async () => headers, refresh, onAuthFailure });

      await expect(client.get('/api/resource')).rejects.toMatchObject({ status: 401 });

      expect(refresh).not.toHaveBeenCalled();
      expect(onAuthFailure).not.toHaveBeenCalled();
    });

    it('un request que salió sin sesión y aparece una al volver reintenta con ella', async () => {
      let headers: Record<string, string> | null = null;
      const fetchMock: FetchMock = vi.fn(async () => {
        if (headers === null) {
          headers = { Authorization: 'Bearer a1' };
          return jsonResponse({ message: 'No' }, 401);
        }
        return jsonResponse({ ok: true });
      });
      const client = createApiClient({ fetch: fetchMock, getAuthHeaders: async () => headers, refresh: vi.fn() });

      await expect(client.get('/api/resource')).resolves.toEqual({ ok: true });

      expect(headersOf(fetchMock, 0).Authorization).toBeUndefined();
      expect(headersOf(fetchMock, 1).Authorization).toBe('Bearer a1');
    });
  });

  describe('waitForRefresh', () => {
    it('sin refresh en curso resuelve enseguida', async () => {
      const client = createApiClient({ fetch: vi.fn(), refresh: vi.fn() });

      await expect(client.waitForRefresh(1_000)).resolves.toBeUndefined();
    });

    it('espera el refresh en curso, aunque falle', async () => {
      const gate = deferred<boolean>();
      const fetchMock: FetchMock = vi.fn().mockResolvedValue(jsonResponse({ message: 'No' }, 401));
      const client = createApiClient({ fetch: fetchMock, refresh: () => gate.promise });

      const request = client.get('/api/resource').catch(() => undefined);
      await flush();
      let settled = false;
      const wait = client.waitForRefresh(1_000).then(() => {
        settled = true;
      });
      await flush();
      expect(settled).toBe(false);

      gate.reject(new Error('red'));
      await wait;
      await request;
      expect(settled).toBe(true);
    });

    it('no espera más que maxMs a un refresh colgado', async () => {
      vi.useFakeTimers();
      try {
        const fetchMock: FetchMock = vi.fn().mockResolvedValue(jsonResponse({ message: 'No' }, 401));
        const client = createApiClient({ fetch: fetchMock, refresh: () => new Promise<boolean>(() => undefined) });

        void client.get('/api/resource').catch(() => undefined);
        await flush();
        let settled = false;
        const wait = client.waitForRefresh(3_000).then(() => {
          settled = true;
        });

        await vi.advanceTimersByTimeAsync(2_999);
        expect(settled).toBe(false);
        await vi.advanceTimersByTimeAsync(1);
        await wait;
        expect(settled).toBe(true);
      } finally {
        vi.useRealTimers();
      }
    });
  });
});
