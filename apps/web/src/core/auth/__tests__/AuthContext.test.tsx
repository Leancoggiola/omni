import { SWRConfig, useSWRConfig } from 'swr';
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';

import { getSessionColorScheme, setSessionColorScheme } from '@/core/theme/sessionColorScheme';
import { api, ApiError, SWR_KEYS } from '@/shared/api';

import { AuthProvider, useAuth } from '../AuthContext';

import type { ReactNode } from 'react';

import { SWR_RETRY_OPTIONS } from '@omni/shared/api';
import { act, renderHook, waitFor } from '@testing-library/react';

const failure = vi.hoisted(() => ({ callback: null as (() => void) | null }));

vi.mock('@/shared/api', async importOriginal => {
  const actual = await importOriginal<typeof import('@/shared/api')>();
  return {
    ...actual,
    api: { post: vi.fn() },
    fetcher: vi.fn().mockResolvedValue(undefined),
    setOnAuthFailure: (cb: () => void) => {
      failure.callback = cb;
    },
    clearOnAuthFailure: () => {
      failure.callback = null;
    },
  };
});

const wrapper = ({ children }: { children: ReactNode }) => (
  <SWRConfig value={{ provider: () => new Map(), fetcher: () => Promise.resolve(undefined) }}>
    <AuthProvider>{children}</AuthProvider>
  </SWRConfig>
);

describe('AuthProvider: override de tema de sesión', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.mocked(api.post)
      .mockReset()
      .mockResolvedValue({ user: { id: 'u1', theme: 'light' } });
  });

  it('logout no descarta el override: /login conserva el tema', async () => {
    setSessionColorScheme('dark');
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(() => result.current.logout());
    expect(getSessionColorScheme()).toBe('dark');
  });

  it('un fallo de auth no descarta el override', async () => {
    setSessionColorScheme('dark');
    renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(failure.callback).not.toBeNull());
    act(() => failure.callback?.());
    expect(getSessionColorScheme()).toBe('dark');
  });

  it('un login fallido conserva el override', async () => {
    setSessionColorScheme('dark');
    vi.mocked(api.post).mockRejectedValueOnce(new Error('Credenciales inválidas'));
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {
      await expect(result.current.login('maria', 'mala')).rejects.toThrow();
    });
    expect(getSessionColorScheme()).toBe('dark');
  });

  it('login descarta el override para que se aplique el tema del perfil', async () => {
    setSessionColorScheme('dark');
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(() => result.current.login('maria', 'secreto'));
    expect(getSessionColorScheme()).toBeNull();
  });
});

const MEDIA_KEY = '/api/media/list-de-prueba';

describe('AuthProvider: sesión local y caché de SWR', () => {
  let cache: Map<string, unknown>;
  let profileFetcher: Mock<(key: string) => Promise<unknown>>;

  const cacheWrapper = ({ children }: { children: ReactNode }) => (
    <SWRConfig value={{ provider: () => cache as never, fetcher: profileFetcher }}>
      <AuthProvider>{children}</AuthProvider>
    </SWRConfig>
  );

  const renderAuth = () => renderHook(() => ({ auth: useAuth(), swr: useSWRConfig() }), { wrapper: cacheWrapper });

  const seedMedia = async (result: ReturnType<typeof renderAuth>['result']) => {
    await act(() => result.current.swr.mutate(MEDIA_KEY, [{ id: 'de-A' }], { revalidate: false }));
    expect(result.current.swr.cache.get(MEDIA_KEY)?.data).toEqual([{ id: 'de-A' }]);
  };

  beforeEach(() => {
    sessionStorage.clear();
    cache = new Map();
    profileFetcher = vi
      .fn<(key: string) => Promise<unknown>>()
      .mockResolvedValue({ user: { id: 'u1', theme: 'light' } });
    vi.mocked(api.post).mockReset().mockResolvedValue(undefined);
  });

  it('logout llama a /logout sin body y vacía toda la caché', async () => {
    const { result } = renderAuth();
    await waitFor(() => expect(result.current.auth.user).not.toBeNull());
    await seedMedia(result);

    await act(() => result.current.auth.logout());

    expect(api.post).toHaveBeenCalledWith(SWR_KEYS.auth.logout);
    expect(result.current.swr.cache.get(MEDIA_KEY)?.data).toBeUndefined();
    await waitFor(() => expect(result.current.auth.user).toBeNull());
  });

  it('logout vacía la caché y no rechaza aunque el POST falle', async () => {
    vi.mocked(api.post).mockRejectedValueOnce(new ApiError('Servicio no disponible', 503));
    const { result } = renderAuth();
    await waitFor(() => expect(result.current.auth.user).not.toBeNull());
    await seedMedia(result);

    await act(async () => {
      await expect(result.current.auth.logout()).resolves.toBeUndefined();
    });

    expect(result.current.swr.cache.get(MEDIA_KEY)?.data).toBeUndefined();
    await waitFor(() => expect(result.current.auth.user).toBeNull());
  });

  it('login vacía la caché del usuario anterior y guarda solo { user }, sin los tokens del body', async () => {
    const user = { id: 'u2', name: 'B', theme: 'light' };
    vi.mocked(api.post).mockResolvedValueOnce({ user, accessToken: 'access-secreto', refreshToken: 'refresh-secreto' });
    const { result } = renderAuth();
    await waitFor(() => expect(result.current.auth.user).not.toBeNull());
    await seedMedia(result);

    await act(() => result.current.auth.login('b', 'secreto'));

    expect(result.current.swr.cache.get(MEDIA_KEY)?.data).toBeUndefined();
    expect(result.current.swr.cache.get(SWR_KEYS.auth.profile)?.data).toEqual({ user });
    expect(result.current.auth.user).toEqual(user);
  });

  it('un login fallido no toca la caché', async () => {
    vi.mocked(api.post).mockRejectedValueOnce(new ApiError('Credenciales inválidas', 401));
    const { result } = renderAuth();
    await waitFor(() => expect(result.current.auth.user).not.toBeNull());
    await seedMedia(result);

    await act(async () => {
      await expect(result.current.auth.login('b', 'mala')).rejects.toThrow('Credenciales inválidas');
    });

    expect(result.current.swr.cache.get(MEDIA_KEY)?.data).toEqual([{ id: 'de-A' }]);
    expect(result.current.auth.user).not.toBeNull();
  });

  it('clearSession vacía la caché sin llamar a la API', async () => {
    const { result } = renderAuth();
    await waitFor(() => expect(result.current.auth.user).not.toBeNull());
    await seedMedia(result);

    await act(() => result.current.auth.clearSession());

    expect(api.post).not.toHaveBeenCalled();
    expect(result.current.swr.cache.get(MEDIA_KEY)?.data).toBeUndefined();
    await waitFor(() => expect(result.current.auth.user).toBeNull());
  });

  it('un fallo de auth vacía la caché', async () => {
    const { result } = renderAuth();
    await waitFor(() => expect(result.current.auth.user).not.toBeNull());
    await seedMedia(result);

    act(() => failure.callback?.());

    await waitFor(() => expect(result.current.swr.cache.get(MEDIA_KEY)?.data).toBeUndefined());
  });

  it('retry vuelve a pedir el perfil después de un error que no es de sesión', async () => {
    profileFetcher.mockRejectedValueOnce(new ApiError('Servicio no disponible', 503));
    const { result } = renderAuth();
    await waitFor(() => expect(result.current.auth.error).toMatchObject({ status: 503 }));
    expect(result.current.auth.user).toBeNull();

    await act(() => result.current.auth.retry());

    await waitFor(() => expect(result.current.auth.user).not.toBeNull());
    expect(result.current.auth.error).toBeUndefined();
  });

  it('con un error, los reintentos automáticos de SWR no vuelven a poner la sesión en carga', async () => {
    profileFetcher.mockRejectedValue(new ApiError('Servicio no disponible', 503));
    const loadingAfterError: boolean[] = [];
    const { result } = renderHook(
      () => {
        const auth = useAuth();
        if (auth.error) loadingAfterError.push(auth.isLoading);
        return auth;
      },
      {
        wrapper: ({ children }: { children: ReactNode }) => (
          <SWRConfig
            value={{ provider: () => new Map(), fetcher: profileFetcher, ...SWR_RETRY_OPTIONS, errorRetryInterval: 1 }}
          >
            <AuthProvider>{children}</AuthProvider>
          </SWRConfig>
        ),
      }
    );

    await waitFor(() => expect(profileFetcher.mock.calls.length).toBeGreaterThan(2));

    expect(result.current.error).toMatchObject({ status: 503 });
    expect(loadingAfterError).not.toContain(true);
  });
});
