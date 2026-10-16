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
import { useSWRConfig } from 'swr';

import { SWR_RETRY_OPTIONS } from '@/core/providers';

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
  /** Hay token pero la sesión no se pudo verificar (red, timeout, 5xx, 429): no prueba que se haya perdido. */
  isSessionUnverified: boolean;
  /** Hay un reintento de la sesión en curso mientras `isSessionUnverified`. */
  isRetryingSession: boolean;
  retrySession: () => void;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Un 4xx que llega al hook (salvo 429) no se arregla reintentando: un 401/403 ya pasó por el refresh del client y
 * dice que la sesión no vale, y cualquier otro deja la sesión sin poder usarse. AuthGate manda al login.
 */
const isSessionRejected = (err: unknown): boolean =>
  err instanceof ApiError && err.status >= 400 && err.status < 500 && err.status !== 429;

/** Espera máxima al POST de logout: más que los 3 s que `logoutSession` espera a un refresh en curso. */
const LOGOUT_SERVER_WAIT_MS = 8_000;

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

  const { data, isLoading, isValidating, error, mutate } = useSWRImmutable<ProfileResponse>(
    bootstrapped && hasToken ? API_KEYS.auth.profile : null,
    fetcher,
    SWR_RETRY_OPTIONS
  );

  const user = data?.user ?? null;
  const isAuthenticated = !!data?.user;
  const isSessionUnverified = hasToken && !isAuthenticated && !!error && !isSessionRejected(error);

  const retrySession = useCallback(() => void mutate(), [mutate]);

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

  /**
   * La sesión se cachea antes de activar la key: el `useSWRImmutable` arranca con el usuario del login y no vuelve a
   * pedir `/auth/profile`. El `mutate` del hook no sirve acá: en este render sigue atado a la key `null`.
   */
  const login = useCallback(
    async (username: string, password: string) => {
      const res = await api.post<AuthTokensResponse>(API_KEYS.auth.login, { username, password });
      await setTokens(res.accessToken, res.refreshToken);
      await globalMutate<ProfileResponse>(API_KEYS.auth.profile, { user: res.user }, { revalidate: false });
      setHasToken(true);
    },
    [globalMutate]
  );

  const logoutInFlight = useRef<Promise<void> | null>(null);

  /**
   * Single-flight: varios toques seguidos (o logout tras eliminar la cuenta) comparten el mismo request. Un error
   * del POST se ignora a propósito: igual se limpia la sesión local. Al POST se lo espera hasta
   * `LOGOUT_SERVER_WAIT_MS`: con la API colgada (su tope es de 100 s) la sesión local se cierra igual y el request
   * sigue en segundo plano con el refresh token que ya leyó. Si lo que falla es el borrado de los tokens en
   * SecureStore, la UI igual sale de la sesión y el error se relanza para que quien llama avise a la persona, porque
   * al reabrir la app los tokens guardados la volverían a loguear.
   */
  const logout = useCallback(() => {
    logoutInFlight.current ??= (async () => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      await Promise.race([
        logoutSession().catch(() => undefined),
        new Promise<void>(resolve => {
          timer = setTimeout(resolve, LOGOUT_SERVER_WAIT_MS);
        }),
      ]);
      clearTimeout(timer);
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
      isSessionUnverified,
      isRetryingSession: isSessionUnverified && isValidating,
      retrySession,
      login,
      logout,
    }),
    [
      user,
      isAuthenticated,
      bootstrapped,
      hasToken,
      isLoading,
      error,
      isSessionUnverified,
      isValidating,
      retrySession,
      login,
      logout,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return ctx;
};
