import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FC,
  type PropsWithChildren,
} from 'react';
import useSWRImmutable from 'swr/immutable';
import { SWRConfig, useSWRConfig, type SWRConfiguration } from 'swr';

import {
  api,
  ApiError,
  API_KEYS,
  clearOnAuthFailure,
  clearTokens,
  fetcher,
  getAccessToken,
  getRefreshToken,
  setOnAuthFailure,
  setTokens,
} from '@/shared/api';

import type { AuthTokensResponse, ProfileResponse, SessionUser } from '@omni/shared/auth';

export type { SessionUser };

interface AuthContextValue {
  user: SessionUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: ApiError | undefined;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Un 4xx no se arregla reintentando (401 ya pasó por el refresh del client, 404 no va a aparecer). */
const isClientError = (err: unknown): boolean => err instanceof ApiError && err.status >= 400 && err.status < 500;

const SWR_OPTIONS: SWRConfiguration = {
  fetcher,
  revalidateOnFocus: false,
  errorRetryCount: 3,
  shouldRetryOnError: err => !isClientError(err),
};

export const AuthProvider: FC<PropsWithChildren> = ({ children }) => {
  const [bootstrapped, setBootstrapped] = useState(false);
  const [hasToken, setHasToken] = useState(false);
  // AuthProvider está por encima de su propio SWRConfig, que no define `provider`: este mutate
  // opera sobre el mismo caché global que usan todos los hooks de la app.
  const { mutate: globalMutate } = useSWRConfig();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = await getAccessToken();
      if (!cancelled) {
        setHasToken(!!token);
        setBootstrapped(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const { data, isLoading, error, mutate } = useSWRImmutable<ProfileResponse>(
    bootstrapped && hasToken ? API_KEYS.auth.profile : null,
    fetcher
  );

  const user = data?.user ?? null;
  const isAuthenticated = !!data?.user;

  /**
   * Cierra la sesión local: sin token la key de sesión pasa a null (`user` → null, AuthGate
   * redirige al login y ColorSchemeContext descarta el override) y se vacía todo el caché de
   * SWR para que el próximo usuario no herede datos del anterior (ej. `users.profile`, immutable).
   */
  const clearSession = useCallback(async () => {
    setHasToken(false);
    await globalMutate(() => true, undefined, { revalidate: false });
  }, [globalMutate]);

  // El client avisa cuando el refresh falla (tokens ya limpios); sin esto el perfil quedaba
  // cacheado y la app seguía "logueada" con todas las requests fallando.
  useEffect(() => {
    setOnAuthFailure(() => void clearSession());
    return clearOnAuthFailure;
  }, [clearSession]);

  const login = useCallback(
    async (username: string, password: string) => {
      const res = await api.post<AuthTokensResponse>(API_KEYS.auth.login, { username, password });
      await setTokens(res.accessToken, res.refreshToken);
      setHasToken(true);
      await mutate({ user: res.user }, { revalidate: false });
    },
    [mutate]
  );

  // Single-flight: varios toques seguidos (o logout tras eliminar la cuenta) comparten el mismo request.
  const logoutInFlight = useRef<Promise<void> | null>(null);

  const logout = useCallback(() => {
    logoutInFlight.current ??= (async () => {
      const refreshToken = await getRefreshToken();
      try {
        await api.post(API_KEYS.auth.logout, { refreshToken: refreshToken ?? undefined });
      } catch {
        // still clear local session
      }
      await clearTokens();
      await clearSession();
    })().finally(() => {
      logoutInFlight.current = null;
    });
    return logoutInFlight.current;
  }, [clearSession]);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated,
      isLoading: !bootstrapped || (hasToken && isLoading),
      error: error as ApiError | undefined,
      login,
      logout,
    }),
    [user, isAuthenticated, bootstrapped, hasToken, isLoading, error, login, logout]
  );

  return (
    <SWRConfig value={SWR_OPTIONS}>
      <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
    </SWRConfig>
  );
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return ctx;
};
