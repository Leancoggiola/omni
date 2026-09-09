import { createContext, FC, PropsWithChildren, useCallback, useContext, useEffect, useMemo } from 'react';
import { useSWRConfig } from 'swr';
import useSWRImmutable from 'swr/immutable';

import { api, ApiError, clearOnAuthFailure, setOnAuthFailure, SWR_KEYS } from '@/shared/api';

import type { SessionUser } from '@omni/shared/auth';
import type { ProfileResponse } from '@omni/shared/auth';

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

export const AuthProvider: FC<PropsWithChildren> = ({ children }) => {
  const { data, isLoading, error, mutate } = useSWRImmutable<ProfileResponse>(SWR_KEYS.auth.profile);
  const { mutate: globalMutate } = useSWRConfig();

  const user = data?.user ?? null;
  const isAuthenticated = !!data?.user;

  const login = useCallback(
    async (username: string, password: string) => {
      const res = await api.post<ProfileResponse>(SWR_KEYS.auth.login, { username, password });
      await mutate(res, { revalidate: false });
    },
    [mutate]
  );

  const logout = useCallback(async () => {
    await api.post(SWR_KEYS.auth.logout);
    await mutate(undefined, { revalidate: false });
  }, [mutate]);

  useEffect(() => {
    setOnAuthFailure(() => {
      globalMutate(() => true, undefined, { revalidate: false });
    });
    return () => clearOnAuthFailure();
  }, [globalMutate]);

  const value = useMemo(
    () => ({ user, isAuthenticated, isLoading, error, login, logout }),
    [user, isAuthenticated, isLoading, error, login, logout]
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
