import { act, renderHook, waitFor } from '@testing-library/react-native';
import useSWR, { SWRConfig, useSWRConfig } from 'swr';
import type { FC, PropsWithChildren } from 'react';

import { API_KEYS } from '@/shared/api';
import { getTokens, setTokens } from '@/shared/api/tokenStorage';
import { deleteItemAsync, getItemAsync, store } from '@/test/secureStoreMock';

import { AuthProvider, useAuth } from './AuthContext';

jest.mock('expo-secure-store', () => jest.requireActual('@/test/secureStoreMock'));

const BASE = 'http://api.test';
const url = (path: string) => `${BASE}${path}`;
const USER = { id: 1, username: 'leo', role: 'USER' };

const Wrapper: FC<PropsWithChildren> = ({ children }) => (
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

const bodyOf = (init: RequestInit) => JSON.parse(init.body as string);

describe('AuthProvider', () => {
  const originalFetch = global.fetch;
  const originalBase = process.env.EXPO_PUBLIC_API_URL;

  let fetchMock: jest.Mock;
  let routes: Record<string, Handler>;

  const callsTo = (path: string) => fetchMock.mock.calls.filter(([calledUrl]) => calledUrl === url(path));

  const renderAuth = () =>
    renderHook(
      () => {
        const auth = useAuth();
        const { cache, mutate } = useSWRConfig();
        return { auth, cache, mutate };
      },
      { wrapper: Wrapper }
    );

  beforeEach(async () => {
    jest.useFakeTimers();
    process.env.EXPO_PUBLIC_API_URL = BASE;
    store.clear();
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

  it('si SecureStore falla al arrancar no queda cargando para siempre', async () => {
    getItemAsync.mockRejectedValueOnce(new Error('keystore no disponible'));

    const { result } = renderAuth();

    await waitFor(() => expect(result.current.auth.isLoading).toBe(false));
    expect(result.current.auth.isAuthenticated).toBe(false);
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
