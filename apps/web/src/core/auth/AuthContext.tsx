import { createContext, FC, PropsWithChildren, useCallback, useContext, useEffect, useMemo } from 'react';
import { useSWRConfig } from 'swr';
import useSWRImmutable from 'swr/immutable';

import { clearSessionColorScheme } from '@/core/theme/sessionColorScheme';
import { api, ApiError, clearOnAuthFailure, setOnAuthFailure, SWR_KEYS } from '@/shared/api';

import type { AuthTokensResponse, ProfileResponse, SessionUser } from '@omni/shared/auth';

export type { SessionUser };

export interface AuthContextValue {
  user: SessionUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: ApiError | undefined;
  login: (username: string, password: string) => Promise<void>;
  /** No rechaza por un fallo del POST: la sesión local se cierra aunque la API no responda. */
  logout: () => Promise<void>;
  /** Cierra la sesión local sin llamar a la API (ej. tras eliminar la cuenta, que ya borra las cookies). */
  clearSession: () => Promise<void>;
  /** Vuelve a pedir el perfil cuando no se pudo verificar la sesión. */
  retry: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: FC<PropsWithChildren> = ({ children }) => {
  const { data, isLoading, error, mutate } = useSWRImmutable<ProfileResponse>(SWR_KEYS.auth.profile);
  const { mutate: globalMutate } = useSWRConfig();

  const user = data?.user ?? null;
  const isAuthenticated = !!data?.user;

  /**
   * Vacía toda la caché de SWR, la de sesión incluida: `useSWRImmutable` no revalida, así que lo que quede
   * se le mostraría al próximo usuario de la pestaña.
   */
  const clearSession = useCallback(async () => {
    await globalMutate(() => true, undefined, { revalidate: false });
  }, [globalMutate]);

  /**
   * El override de tema sobrevive al logout y al vencimiento para que /login conserve el tema; se descarta
   * acá, antes de que useSyncColorScheme aplique el del perfil. Todo flujo de entrada nuevo (registro, SSO)
   * debe hacer lo mismo. La caché se vacía una vez que la API aceptó el login, así uno fallido no la toca, y
   * se guarda solo `{ user }`: los tokens del body no deben quedar legibles desde JS.
   */
  const login = useCallback(
    async (username: string, password: string) => {
      const res = await api.post<AuthTokensResponse>(SWR_KEYS.auth.login, { username, password });
      await clearSession();
      clearSessionColorScheme();
      await mutate({ user: res.user }, { revalidate: false });
    },
    [clearSession, mutate]
  );

  const logout = useCallback(async () => {
    try {
      await api.post(SWR_KEYS.auth.logout);
    } catch {
    } finally {
      await clearSession();
    }
  }, [clearSession]);

  const retry = useCallback(async () => {
    await mutate();
  }, [mutate]);

  useEffect(() => {
    setOnAuthFailure(() => {
      void clearSession();
    });
    return () => clearOnAuthFailure();
  }, [clearSession]);

  const value = useMemo(
    () => ({ user, isAuthenticated, isLoading, error, login, logout, clearSession, retry }),
    [user, isAuthenticated, isLoading, error, login, logout, clearSession, retry]
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
