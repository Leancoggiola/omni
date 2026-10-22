import { API_KEYS } from './keys';

jest.mock('expo-secure-store', () => jest.requireActual('@/test/secureStoreMock'));

const BASE = 'http://api.test';
const REFRESH_URL = `${BASE}${API_KEYS.auth.refresh}`;
const LOGOUT_URL = `${BASE}${API_KEYS.auth.logout}`;
const HEALTH_URL = `${BASE}${API_KEYS.health}`;

type Client = typeof import('./client');
type Storage = typeof import('./tokenStorage');
type Handler = (url: string, init: RequestInit) => unknown;

const jsonResponse = (body: unknown, status = 200) => ({
  ok: status < 400,
  status,
  headers: new Headers({ 'content-type': 'application/json' }),
  json: () => Promise.resolve(body),
});

const deferred = <T = void>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(res => {
    resolve = res;
  });
  return { promise, resolve };
};

const flush = async () => {
  for (let i = 0; i < 20; i++) await Promise.resolve();
};

const until = async (condition: () => boolean) => {
  for (let i = 0; i < 200 && !condition(); i++) await Promise.resolve();
  expect(condition()).toBe(true);
};

const bearer = (init: RequestInit) => (init.headers as Record<string, string>).Authorization;
const bodyOf = (init: RequestInit) => JSON.parse(init.body as string);

describe('api client', () => {
  const originalFetch = global.fetch;
  const originalBase = process.env.EXPO_PUBLIC_API_URL;

  let client: Client;
  let storage: Storage;
  let fetchMock: jest.Mock;
  let onAuthFailure: jest.Mock;

  const respondWith = (handler: Handler) => {
    fetchMock.mockImplementation(async (url: string, init: RequestInit) => handler(url, init));
  };

  const callsTo = (url: string) => fetchMock.mock.calls.filter(([calledUrl]) => calledUrl === url);

  const refreshReturning = (accessToken: string, refreshToken: string) => jsonResponse({ accessToken, refreshToken });

  const apiWithAccess = (valid: string, refresh: Handler): Handler => {
    return (url, init) => {
      if (url === REFRESH_URL) return refresh(url, init);
      return bearer(init) === `Bearer ${valid}` ? jsonResponse({ ok: true }) : jsonResponse({ message: 'No' }, 401);
    };
  };

  beforeEach(async () => {
    jest.resetModules();
    process.env.EXPO_PUBLIC_API_URL = BASE;
    client = jest.requireActual<Client>('./client');
    storage = jest.requireActual<Storage>('./tokenStorage');
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    onAuthFailure = jest.fn();
    client.setOnAuthFailure(onAuthFailure);
    await storage.setTokens('access-1', 'refresh-1');
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.EXPO_PUBLIC_API_URL = originalBase;
  });

  describe('request', () => {
    it('manda el access token guardado como Bearer', async () => {
      respondWith(() => jsonResponse({ ok: true }));

      await expect(client.api.get('/api/resource')).resolves.toEqual({ ok: true });

      expect(bearer(fetchMock.mock.calls[0][1])).toBe('Bearer access-1');
    });

    it('si SecureStore falla al leer el token el request sale igual, sin Authorization', async () => {
      const secure = jest.requireMock<typeof import('@/test/secureStoreMock')>('expo-secure-store');
      secure.getItemAsync.mockRejectedValueOnce(new Error('keystore no disponible'));
      respondWith(() => jsonResponse({ ok: true }));

      await expect(client.api.post(API_KEYS.auth.login, { username: 'leo', password: 'secreto' })).resolves.toEqual({
        ok: true,
      });

      expect(bearer(fetchMock.mock.calls[0][1])).toBeUndefined();
    });
  });

  describe('refresh ante un 401', () => {
    it('reintenta con el par nuevo y lo guarda', async () => {
      respondWith(apiWithAccess('access-2', () => refreshReturning('access-2', 'refresh-2')));

      await expect(client.api.get('/api/resource')).resolves.toEqual({ ok: true });

      expect(bodyOf(callsTo(REFRESH_URL)[0][1])).toEqual({ refreshToken: 'refresh-1' });
      expect(await storage.getTokens()).toEqual({ accessToken: 'access-2', refreshToken: 'refresh-2' });
    });

    it('un 401 que llega después de otro refresh reintenta sin rotar de nuevo', async () => {
      const staleResponse = deferred<unknown>();
      respondWith((url, init) => {
        if (url === `${BASE}/api/slow` && bearer(init) === 'Bearer access-1') return staleResponse.promise;
        return apiWithAccess('access-2', () => refreshReturning('access-2', 'refresh-2'))(url, init);
      });

      const slow = client.api.get('/api/slow');
      await flush();
      await client.api.get('/api/fast');
      expect(callsTo(REFRESH_URL)).toHaveLength(1);

      staleResponse.resolve(jsonResponse({ message: 'No' }, 401));

      await expect(slow).resolves.toEqual({ ok: true });
      expect(callsTo(REFRESH_URL)).toHaveLength(1);
    });

    it.each([[401], [403]])('un refresh con %s limpia los tokens y avisa una sola vez', async status => {
      respondWith(apiWithAccess('never', () => jsonResponse({ message: 'La sesión ya no es válida' }, status)));

      const results = await Promise.allSettled([client.api.get('/api/a'), client.api.get('/api/b')]);

      expect(results.map(r => r.status)).toEqual(['rejected', 'rejected']);
      expect(await storage.getTokens()).toBeNull();
      expect(onAuthFailure).toHaveBeenCalledTimes(1);
      expect(callsTo(REFRESH_URL)).toHaveLength(1);
    });

    it('si SecureStore falla justo después de un 401 se propaga el 401, no el error del keystore', async () => {
      const secure = jest.requireMock<typeof import('@/test/secureStoreMock')>('expo-secure-store');
      respondWith(() => jsonResponse({ message: 'No' }, 401));
      secure.getItemAsync.mockResolvedValueOnce(JSON.stringify({ accessToken: 'access-1', refreshToken: 'refresh-1' }));
      secure.getItemAsync.mockRejectedValueOnce(new Error('keystore no disponible'));

      await expect(client.api.get('/api/resource')).rejects.toMatchObject({ status: 401 });

      expect(callsTo(REFRESH_URL)).toHaveLength(0);
    });

    it('un 401 tardío tras cerrarse la sesión no refresca ni avisa de nuevo', async () => {
      const staleResponse = deferred<unknown>();
      respondWith((url, init) => {
        if (url === `${BASE}/api/slow`) return staleResponse.promise;
        return apiWithAccess('never', () => jsonResponse({ message: 'No' }, 401))(url, init);
      });

      const slow = client.api.get('/api/slow');
      await flush();
      await expect(client.api.get('/api/fast')).rejects.toMatchObject({ status: 401 });
      staleResponse.resolve(jsonResponse({ message: 'No' }, 401));

      await expect(slow).rejects.toMatchObject({ status: 401 });
      expect(callsTo(REFRESH_URL)).toHaveLength(1);
      expect(onAuthFailure).toHaveBeenCalledTimes(1);
    });

    it('un refresh exitoso que termina después de cerrar la sesión no la revive', async () => {
      const gate = deferred<unknown>();
      respondWith(apiWithAccess('access-2', () => gate.promise));

      const request = client.api.get('/api/resource');
      await until(() => callsTo(REFRESH_URL).length === 1);
      await storage.clearTokens();
      gate.resolve(refreshReturning('access-2', 'refresh-2'));

      await expect(request).rejects.toMatchObject({ status: 401 });
      expect(await storage.getTokens()).toBeNull();
    });

    it('un refresh rechazado que termina después de un login nuevo no borra la sesión nueva', async () => {
      const gate = deferred<unknown>();
      respondWith(apiWithAccess('access-9', () => gate.promise));

      const request = client.api.get('/api/resource');
      await until(() => callsTo(REFRESH_URL).length === 1);
      await storage.setTokens('access-9', 'refresh-9');
      gate.resolve(jsonResponse({ message: 'La sesión ya no es válida' }, 401));

      await expect(request).resolves.toEqual({ ok: true });
      expect(await storage.getTokens()).toEqual({ accessToken: 'access-9', refreshToken: 'refresh-9' });
      expect(onAuthFailure).not.toHaveBeenCalled();
    });

    it.each([[500], [429]])(
      'un refresh con %s que termina tras cerrarse la sesión no propaga su error',
      async status => {
        const gate = deferred<unknown>();
        respondWith(apiWithAccess('never', () => gate.promise));

        const request = client.api.get('/api/resource');
        await until(() => callsTo(REFRESH_URL).length === 1);
        await storage.clearTokens();
        gate.resolve(jsonResponse({ message: 'Intentá más tarde' }, status));

        await expect(request).rejects.toMatchObject({ status: 401 });
      }
    );

    it.each([[500], [503], [429]])('un refresh con %s conserva los tokens y propaga el error', async status => {
      respondWith(apiWithAccess('never', () => jsonResponse({ message: 'Intentá más tarde' }, status)));

      await expect(client.api.get('/api/resource')).rejects.toMatchObject({ name: 'ApiError', status });

      expect(await storage.getTokens()).toEqual({ accessToken: 'access-1', refreshToken: 'refresh-1' });
      expect(onAuthFailure).not.toHaveBeenCalled();
    });

    it('un error de red en el refresh conserva los tokens y propaga el error', async () => {
      respondWith(url => {
        if (url === REFRESH_URL || url === HEALTH_URL) throw new TypeError('Network request failed');
        return jsonResponse({ message: 'No' }, 401);
      });

      jest.useFakeTimers();
      try {
        const request = client.api.get('/api/resource');
        const assertion = expect(request).rejects.toThrow('Network request failed');
        await jest.advanceTimersByTimeAsync(2_000);
        await assertion;
      } finally {
        jest.useRealTimers();
      }

      expect(await storage.getTokens()).toEqual({ accessToken: 'access-1', refreshToken: 'refresh-1' });
      expect(onAuthFailure).not.toHaveBeenCalled();
    });

    it('un 504 del proxy en el refresh se reintenta enseguida (dentro de la gracia de rotación de la API)', async () => {
      let refreshes = 0;
      const gatewayTimeout = { ok: false, status: 504, headers: new Headers({ 'content-type': 'text/html' }) };
      respondWith((url, init) => {
        if (url === HEALTH_URL) return jsonResponse({ status: 'ok' });
        return apiWithAccess('access-2', () =>
          ++refreshes === 1 ? gatewayTimeout : refreshReturning('access-2', 'refresh-2')
        )(url, init);
      });

      await expect(client.api.get('/api/resource')).resolves.toEqual({ ok: true });

      expect(refreshes).toBe(2);
      expect(await storage.getTokens()).toEqual({ accessToken: 'access-2', refreshToken: 'refresh-2' });
    });

    it('un refresh fallido por error transitorio se puede reintentar en el próximo request', async () => {
      let refreshes = 0;
      respondWith(
        apiWithAccess('access-2', () =>
          ++refreshes === 1 ? jsonResponse({ message: 'Caída breve' }, 503) : refreshReturning('access-2', 'refresh-2')
        )
      );

      await expect(client.api.get('/api/resource')).rejects.toMatchObject({ status: 503 });
      await expect(client.api.get('/api/resource')).resolves.toEqual({ ok: true });
    });

    it('un request sin sesión que recibe 401 no refresca ni avisa', async () => {
      await storage.clearTokens();
      respondWith(() => jsonResponse({ message: 'No' }, 401));

      await expect(client.api.get('/api/resource')).rejects.toMatchObject({ status: 401 });

      expect(callsTo(REFRESH_URL)).toHaveLength(0);
      expect(onAuthFailure).not.toHaveBeenCalled();
    });
  });

  describe('logoutSession', () => {
    const logoutOk = () => jsonResponse({ message: 'Sesión cerrada exitosamente' });

    it('con el access vencido manda el refresh token vigente y no refresca', async () => {
      respondWith(url => (url === LOGOUT_URL ? logoutOk() : jsonResponse({ message: 'No' }, 401)));

      await client.logoutSession();

      expect(callsTo(REFRESH_URL)).toHaveLength(0);
      expect(callsTo(LOGOUT_URL)).toHaveLength(1);
      expect(bodyOf(callsTo(LOGOUT_URL)[0][1])).toEqual({ refreshToken: 'refresh-1' });
    });

    it('manda el token rotado por un refresh anterior, no el que había al abrir la app', async () => {
      respondWith((url, init) =>
        url === LOGOUT_URL
          ? logoutOk()
          : apiWithAccess('access-2', () => refreshReturning('access-2', 'refresh-2'))(url, init)
      );
      await client.api.get('/api/resource');

      await client.logoutSession();

      expect(bodyOf(callsTo(LOGOUT_URL)[0][1])).toEqual({ refreshToken: 'refresh-2' });
    });

    it('espera un refresh en curso y manda el token que dejó', async () => {
      const gate = deferred<unknown>();
      respondWith((url, init) =>
        url === LOGOUT_URL ? logoutOk() : apiWithAccess('access-2', () => gate.promise)(url, init)
      );

      const request = client.api.get('/api/resource');
      await flush();
      const logout = client.logoutSession();
      await flush();
      expect(callsTo(LOGOUT_URL)).toHaveLength(0);

      gate.resolve(refreshReturning('access-2', 'refresh-2'));
      await Promise.all([request, logout]);

      expect(bodyOf(callsTo(LOGOUT_URL)[0][1])).toEqual({ refreshToken: 'refresh-2' });
    });

    it('sigue con el logout aunque el refresh en curso haya fallado', async () => {
      const gate = deferred<unknown>();
      respondWith((url, init) =>
        url === LOGOUT_URL ? logoutOk() : apiWithAccess('never', () => gate.promise)(url, init)
      );

      const request = client.api.get('/api/resource').catch(() => undefined);
      await flush();
      const logout = client.logoutSession();
      await flush();
      expect(callsTo(LOGOUT_URL)).toHaveLength(0);
      gate.resolve(jsonResponse({ message: 'Caída breve' }, 503));
      await Promise.all([request, logout]);

      expect(bodyOf(callsTo(LOGOUT_URL)[0][1])).toEqual({ refreshToken: 'refresh-1' });
    });

    it('no espera más de 3 s a un refresh colgado y manda el token guardado', async () => {
      jest.useFakeTimers();
      try {
        const gate = deferred<unknown>();
        respondWith((url, init) =>
          url === LOGOUT_URL ? logoutOk() : apiWithAccess('never', () => gate.promise)(url, init)
        );

        const request = client.api.get('/api/resource').catch(() => undefined);
        await until(() => callsTo(REFRESH_URL).length === 1);
        const logout = client.logoutSession();
        await jest.advanceTimersByTimeAsync(2_000);
        expect(callsTo(LOGOUT_URL)).toHaveLength(0);

        await jest.advanceTimersByTimeAsync(1_500);
        await logout;

        expect(bodyOf(callsTo(LOGOUT_URL)[0][1])).toEqual({ refreshToken: 'refresh-1' });
        gate.resolve(jsonResponse({ message: 'Caída breve' }, 503));
        await request;
      } finally {
        jest.useRealTimers();
      }
    });

    it('sin sesión no hace ningún request', async () => {
      await storage.clearTokens();
      respondWith(() => logoutOk());

      await expect(client.logoutSession()).resolves.toBeUndefined();

      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('no reintenta con refresh si el servidor responde 401', async () => {
      respondWith(() => jsonResponse({ message: 'No' }, 401));

      await expect(client.logoutSession()).rejects.toMatchObject({ status: 401 });

      expect(callsTo(REFRESH_URL)).toHaveLength(0);
      expect(callsTo(LOGOUT_URL)).toHaveLength(1);
    });
  });
});
