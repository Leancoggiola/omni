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
  logoutSession,
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

/**
 * Un 4xx no se arregla reintentando (401 ya pasó por el refresh del client, 404 no va a aparecer). Un 429 sí: es
 * transitorio, y también llega cuando el que lo devuelve es el refresh (el client propaga su `ApiError`).
 */
const isClientError = (err: unknown): boolean =>
  err instanceof ApiError && err.status >= 400 && err.status < 500 && err.status !== 429;

const BOOTSTRAP_READ_ATTEMPTS = 3;
const BOOTSTRAP_READ_RETRY_MS = 500;

/**
 * Lee el access token al arrancar. Un fallo de SecureStore puede ser transitorio (keystore todavía bloqueado), así
 * que se reintenta unas veces antes de rendirse; si sigue fallando se trata como "sin sesión" (se muestra el login,
 * sin tocar los tokens guardados) en vez de dejar la app cargando para siempre.
 */
async function readBootstrapToken(): Promise<string | null> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await getAccessToken();
    } catch {
      if (attempt >= BOOTSTRAP_READ_ATTEMPTS) return null;
      await new Promise(resolve => setTimeout(resolve, BOOTSTRAP_READ_RETRY_MS));
    }
  }
}

const SWR_OPTIONS: SWRConfiguration = {
  fetcher,
  revalidateOnFocus: false,
  errorRetryCount: 3,
  shouldRetryOnError: err => !isClientError(err),
};

export const AuthProvider: FC<PropsWithChildren> = ({ children }) => {
  const [bootstrapped, setBootstrapped] = useState(false);
  const [hasToken, setHasToken] = useState(false);
  const { mutate: globalMutate } = useSWRConfig();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = await readBootstrapToken();
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

  const logoutInFlight = useRef<Promise<void> | null>(null);

  /**
   * Single-flight: varios toques seguidos (o logout tras eliminar la cuenta) comparten el mismo request. Un error
   * del POST se ignora a propósito: igual se limpia la sesión local. Si lo que falla es el borrado de los tokens
   * en SecureStore, la UI igual sale de la sesión y el error se relanza para que quien llama avise a la persona,
   * porque al reabrir la app los tokens guardados la volverían a loguear.
   */
  const logout = useCallback(() => {
    logoutInFlight.current ??= (async () => {
      try {
        await logoutSession();
      } catch {}
      let clearTokensError: unknown;
      try {
        await clearTokens();
      } catch (error) {
        clearTokensError = error;
      }
      await clearSession();
      if (clearTokensError) throw clearTokensError;
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
