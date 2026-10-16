import { act, renderHook, waitFor } from '@testing-library/react-native';
import useSWR, { SWRConfig, useSWRConfig } from 'swr';
import type { FC, PropsWithChildren } from 'react';

import { SWRProvider } from '@/core/providers';
import { API_KEYS } from '@/shared/api';
import { getTokens, setTokens } from '@/shared/api/tokenStorage';
import { deleteItemAsync, getItemAsync, store } from '@/test/secureStoreMock';

import { AuthProvider, useAuth } from './AuthContext';

jest.mock('expo-secure-store', () => jest.requireActual('@/test/secureStoreMock'));

const BASE = 'http://api.test';
const url = (path: string) => `${BASE}${path}`;
const USER = { id: 1, username: 'leo', role: 'USER' };

let swrCache = new Map();

const Wrapper: FC<PropsWithChildren> = ({ children }) => (
  <SWRProvider store={swrCache}>
    <AuthProvider>{children}</AuthProvider>
  </SWRProvider>
);

/** Sin las opciones globales de `SWRProvider`: prueba que el hook de sesión trae sus propios reintentos. */
const BareWrapper: FC<PropsWithChildren> = ({ children }) => (
  <SWRConfig value={{ provider: () => new Map() }}>
    <AuthProvider>{children}</AuthProvider>
  </SWRConfig>
);

type Handler = (init: RequestInit) => unknown;

const jsonResponse = (body: unknown, status = 200) => ({
  ok: status < 400,
  status,
  headers: new Headers({ 'content-type': 'application/json' }),
  json: () => Promise.resolve(body),
});

const readFromStore = async (key: string) => store.get(key) ?? null;
const bodyOf = (init: RequestInit) => JSON.parse(init.body as string);

describe('AuthProvider', () => {
  const originalFetch = global.fetch;
  const originalBase = process.env.EXPO_PUBLIC_API_URL;

  let fetchMock: jest.Mock;
  let routes: Record<string, Handler>;

  const callsTo = (path: string) => fetchMock.mock.calls.filter(([calledUrl]) => calledUrl === url(path));

  const renderAuth = (wrapper: FC<PropsWithChildren> = Wrapper) =>
    renderHook(
      () => {
        const auth = useAuth();
        const { cache, mutate } = useSWRConfig();
        return { auth, cache, mutate };
      },
      { wrapper }
    );

  beforeEach(async () => {
    swrCache = new Map();
    jest.useFakeTimers();
    process.env.EXPO_PUBLIC_API_URL = BASE;
    store.clear();
    getItemAsync.mockReset();
    getItemAsync.mockImplementation(readFromStore);
    routes = {
      [API_KEYS.auth.profile]: () => jsonResponse({ user: USER }),
      [API_KEYS.auth.logout]: () => jsonResponse({ message: 'Sesión cerrada exitosamente' }),
    };
    fetchMock = jest.fn(async (target: string, init: RequestInit) => {
      const handler = Object.entries(routes).find(([path]) => url(path) === target)?.[1];
      return handler ? handler(init) : jsonResponse({ message: 'Not found' }, 404);
    });
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    global.fetch = originalFetch;
    process.env.EXPO_PUBLIC_API_URL = originalBase;
  });

  it('sin tokens guardados queda sin sesión y no pide el perfil', async () => {
    const { result } = renderAuth();

    await waitFor(() => expect(result.current.auth.isLoading).toBe(false));

    expect(result.current.auth.isAuthenticated).toBe(false);
    expect(callsTo(API_KEYS.auth.profile)).toHaveLength(0);
  });

  it('con tokens guardados carga el usuario', async () => {
    await setTokens('access-1', 'refresh-1');
    const { result } = renderAuth();

    await waitFor(() => expect(result.current.auth.isAuthenticated).toBe(true));

    expect(result.current.auth.user).toEqual(USER);
  });

  it('login guarda el par de tokens en una sola clave y deja al usuario autenticado', async () => {
    routes[API_KEYS.auth.login] = () =>
      jsonResponse({ accessToken: 'access-1', refreshToken: 'refresh-1', user: USER });
    const { result } = renderAuth();
    await waitFor(() => expect(result.current.auth.isLoading).toBe(false));

    await act(() => result.current.auth.login('leo', 'secreto'));

    expect(result.current.auth.user).toEqual(USER);
    expect(await getTokens()).toEqual({ accessToken: 'access-1', refreshToken: 'refresh-1' });
  });

  it('login cachea la sesión con el usuario de la respuesta y no vuelve a pedir el perfil', async () => {
    routes[API_KEYS.auth.login] = () =>
      jsonResponse({ accessToken: 'access-1', refreshToken: 'refresh-1', user: USER });
    const { result } = renderAuth();
    await waitFor(() => expect(result.current.auth.isLoading).toBe(false));

    await act(() => result.current.auth.login('leo', 'secreto'));
    await act(async () => {
      await jest.advanceTimersByTimeAsync(1_000);
    });

    expect(result.current.auth.isAuthenticated).toBe(true);
    expect(result.current.auth.isLoading).toBe(false);
    expect(callsTo(API_KEYS.auth.profile)).toHaveLength(0);
  });

  describe('sesión sin verificar', () => {
    const goOffline = () => {
      fetchMock.mockImplementation(async () => {
        throw new TypeError('Network request failed');
      });
    };

    const waitUntilUnverified = async (result: { current: { auth: { isSessionUnverified: boolean } } }) => {
      await waitFor(() => expect(callsTo(API_KEYS.health)).toHaveLength(1));
      await act(async () => {
        await jest.advanceTimersByTimeAsync(2_000);
      });
      await waitFor(() => expect(result.current.auth.isSessionUnverified).toBe(true));
    };

    it('con token y la API caída queda sin verificar, sin sesión y con los tokens guardados', async () => {
      goOffline();
      await setTokens('access-1', 'refresh-1');
      const { result } = renderAuth();

      await waitUntilUnverified(result);

      expect(result.current.auth.isAuthenticated).toBe(false);
      expect(await getTokens()).toEqual({ accessToken: 'access-1', refreshToken: 'refresh-1' });
    });

    it('retrySession vuelve a pedir el perfil y entra cuando la API responde', async () => {
      goOffline();
      await setTokens('access-1', 'refresh-1');
      const { result } = renderAuth();
      await waitUntilUnverified(result);

      fetchMock.mockImplementation(async (target: string) =>
        target === url(API_KEYS.auth.profile) ? jsonResponse({ user: USER }) : jsonResponse({}, 404)
      );
      act(() => result.current.auth.retrySession());
      expect(result.current.auth.isRetryingSession).toBe(true);

      await waitFor(() => expect(result.current.auth.isAuthenticated).toBe(true));
      expect(result.current.auth.isSessionUnverified).toBe(false);
      expect(result.current.auth.isRetryingSession).toBe(false);
    });

    it('el hook de sesión trae sus propios reintentos: un 500 se reintenta 3 veces y un 404 ninguna', async () => {
      routes[API_KEYS.auth.profile] = () => jsonResponse({ message: 'Error' }, 500);
      await setTokens('access-1', 'refresh-1');
      const failing = renderAuth(BareWrapper);
      await waitFor(() => expect(failing.result.current.auth.isSessionUnverified).toBe(true));
      await act(async () => {
        await jest.advanceTimersByTimeAsync(300_000);
      });
      expect(callsTo(API_KEYS.auth.profile)).toHaveLength(4);
      failing.unmount();

      fetchMock.mockClear();
      routes[API_KEYS.auth.profile] = () => jsonResponse({ message: 'No existe' }, 404);
      const missing = renderAuth(BareWrapper);
      await waitFor(() => expect(missing.result.current.auth.error).toBeDefined());
      await act(async () => {
        await jest.advanceTimersByTimeAsync(300_000);
      });
      expect(callsTo(API_KEYS.auth.profile)).toHaveLength(1);
    });

    it('un 4xx que no es 429 tampoco: AuthGate manda al login en vez de quedar en el ErrorState', async () => {
      routes[API_KEYS.auth.profile] = () => jsonResponse({ message: 'No existe' }, 404);
      await setTokens('access-1', 'refresh-1');
      const { result } = renderAuth();

      await waitFor(() => expect(result.current.auth.error).toBeDefined());
      expect(result.current.auth.isSessionUnverified).toBe(false);
      expect(result.current.auth.isAuthenticated).toBe(false);
    });

    it.each([408, 429])('un %i sí queda sin verificar: es transitorio', async status => {
      routes[API_KEYS.auth.profile] = () => jsonResponse({ message: 'Transitorio' }, status);
      await setTokens('access-1', 'refresh-1');
      const { result } = renderAuth();

      await waitFor(() => expect(result.current.auth.isSessionUnverified).toBe(true));
    });

    it('un 401 que llega al hook (el refresh ya renovó y la API lo sigue rechazando) no es una sesión sin verificar', async () => {
      routes[API_KEYS.auth.profile] = () => jsonResponse({ message: 'Usuario no encontrado' }, 401);
      routes[API_KEYS.auth.refresh] = () => jsonResponse({ accessToken: 'access-2', refreshToken: 'refresh-2' });
      await setTokens('access-1', 'refresh-1');
      const { result } = renderAuth();

      await waitFor(() => expect(result.current.auth.error).toBeDefined());
      expect(result.current.auth.isSessionUnverified).toBe(false);
      expect(result.current.auth.isAuthenticated).toBe(false);
    });
  });

  describe('logout', () => {
    const signIn = async () => {
      await setTokens('access-vencido', 'refresh-1');
      const hook = renderAuth();
      await waitFor(() => expect(hook.result.current.auth.isAuthenticated).toBe(true));
      return hook;
    };

    it('con el access vencido manda el refresh token vigente, sin refrescar, y cierra la sesión', async () => {
      const { result } = await signIn();

      await act(() => result.current.auth.logout());

      expect(callsTo(API_KEYS.auth.refresh)).toHaveLength(0);
      expect(bodyOf(callsTo(API_KEYS.auth.logout)[0][1])).toEqual({ refreshToken: 'refresh-1' });
      expect(await getTokens()).toBeNull();
      expect(result.current.auth.user).toBeNull();
      expect(result.current.auth.isAuthenticated).toBe(false);
    });

    it('manda el token que dejó un refresh anterior', async () => {
      routes[API_KEYS.auth.profile] = init =>
        (init.headers as Record<string, string>).Authorization === 'Bearer access-2'
          ? jsonResponse({ user: USER })
          : jsonResponse({ message: 'No' }, 401);
      routes[API_KEYS.auth.refresh] = () => jsonResponse({ accessToken: 'access-2', refreshToken: 'refresh-2' });
      const { result } = await signIn();

      await act(() => result.current.auth.logout());

      expect(bodyOf(callsTo(API_KEYS.auth.logout)[0][1])).toEqual({ refreshToken: 'refresh-2' });
    });

    it('limpia la sesión local aunque el servidor falle', async () => {
      routes[API_KEYS.auth.logout] = () => jsonResponse({ message: 'Error' }, 500);
      const { result } = await signIn();

      await act(() => result.current.auth.logout());

      expect(await getTokens()).toBeNull();
      expect(result.current.auth.user).toBeNull();
    });

    it('con la API colgada no espera el tope del POST: cierra la sesión local a los 8 s', async () => {
      const { result } = await signIn();
      routes[API_KEYS.auth.logout] = () => new Promise(() => undefined);

      let done = false;
      const logout = result.current.auth.logout().then(() => {
        done = true;
      });
      await act(async () => {
        await jest.advanceTimersByTimeAsync(7_000);
      });
      expect(done).toBe(false);

      await act(async () => {
        await jest.advanceTimersByTimeAsync(1_500);
        await logout;
      });

      expect(result.current.auth.isAuthenticated).toBe(false);
      expect(await getTokens()).toBeNull();
      expect(callsTo(API_KEYS.auth.logout)).toHaveLength(1);
    });

    it('varios toques seguidos comparten un solo request', async () => {
      const { result } = await signIn();

      await act(() => Promise.all([result.current.auth.logout(), result.current.auth.logout()]));

      expect(callsTo(API_KEYS.auth.logout)).toHaveLength(1);
    });
  });

  it('un refresh que falla con 401 cierra la sesión y limpia los tokens', async () => {
    routes[API_KEYS.auth.profile] = () => jsonResponse({ message: 'No' }, 401);
    routes[API_KEYS.auth.refresh] = () => jsonResponse({ message: 'La sesión ya no es válida' }, 401);
    await setTokens('access-vencido', 'refresh-1');

    const { result } = renderAuth();

    await waitFor(async () => expect(await getTokens()).toBeNull());
    await waitFor(() => expect(result.current.auth.isLoading).toBe(false));
    expect(result.current.auth.isAuthenticated).toBe(false);
  });

  it('un refresh con 500 conserva los tokens', async () => {
    routes[API_KEYS.auth.profile] = () => jsonResponse({ message: 'No' }, 401);
    routes[API_KEYS.auth.refresh] = () => jsonResponse({ message: 'Error' }, 500);
    await setTokens('access-vencido', 'refresh-1');

    const { result } = renderAuth();

    await waitFor(() => expect(result.current.auth.error).toBeDefined());
    expect(await getTokens()).toEqual({ accessToken: 'access-vencido', refreshToken: 'refresh-1' });
  });

  it('un 429 en un hook de datos se reintenta, a diferencia de otros 4xx', async () => {
    let throttled = 0;
    routes['/api/probe-429'] = () =>
      ++throttled === 1 ? jsonResponse({ message: 'Demasiados intentos' }, 429) : jsonResponse({ ok: true });
    routes['/api/probe-404'] = () => jsonResponse({ message: 'No existe' }, 404);
    await setTokens('access-1', 'refresh-1');

    const { result } = renderHook(
      () => ({
        throttled: useSWR('/api/probe-429'),
        missing: useSWR('/api/probe-404'),
      }),
      { wrapper: Wrapper }
    );
    await waitFor(() => expect(result.current.throttled.error).toBeDefined());
    await act(async () => {
      await jest.advanceTimersByTimeAsync(60_000);
    });

    expect(result.current.throttled.data).toEqual({ ok: true });
    expect(callsTo('/api/probe-429')).toHaveLength(2);
    expect(callsTo('/api/probe-404')).toHaveLength(1);
  });

  it('si SecureStore falla un momento al arrancar reintenta y conserva la sesión', async () => {
    await setTokens('access-1', 'refresh-1');
    getItemAsync.mockRejectedValueOnce(new Error('keystore no disponible'));

    const { result } = renderAuth();
    await act(async () => {
      await jest.advanceTimersByTimeAsync(600);
    });

    await waitFor(() => expect(result.current.auth.isAuthenticated).toBe(true));
  });

  it('si SecureStore sigue fallando al arrancar no queda cargando para siempre ni borra los tokens', async () => {
    await setTokens('access-1', 'refresh-1');
    getItemAsync.mockRejectedValue(new Error('keystore no disponible'));

    const { result } = renderAuth();
    await act(async () => {
      await jest.advanceTimersByTimeAsync(2_000);
    });

    await waitFor(() => expect(result.current.auth.isLoading).toBe(false));
    expect(result.current.auth.isAuthenticated).toBe(false);
    getItemAsync.mockImplementation(readFromStore);
    expect(await getTokens()).toEqual({ accessToken: 'access-1', refreshToken: 'refresh-1' });
  });

  it('logout cierra la sesión local y avisa del error si SecureStore falla al borrar los tokens', async () => {
    await setTokens('access-1', 'refresh-1');
    const { result } = renderAuth();
    await waitFor(() => expect(result.current.auth.isAuthenticated).toBe(true));
    deleteItemAsync.mockRejectedValueOnce(new Error('no se pudo borrar'));

    await act(async () => {
      await expect(result.current.auth.logout()).rejects.toThrow('no se pudo borrar');
    });

    expect(result.current.auth.user).toBeNull();
    expect(result.current.auth.isAuthenticated).toBe(false);
  });

  it('clearSession vacía la caché de SWR para que el próximo usuario no herede datos', async () => {
    await setTokens('access-1', 'refresh-1');
    const { result } = renderAuth();
    await waitFor(() => expect(result.current.auth.isAuthenticated).toBe(true));
    await act(() => result.current.mutate('/api/otro-dato', { dato: 1 }, { revalidate: false }));
    expect(result.current.cache.get('/api/otro-dato')?.data).toEqual({ dato: 1 });

    await act(() => result.current.auth.logout());

    expect(result.current.cache.get('/api/otro-dato')?.data).toBeUndefined();
    expect(result.current.cache.get(API_KEYS.auth.profile)?.data).toBeUndefined();
  });
});
