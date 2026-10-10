import { SWRConfig } from 'swr';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getSessionColorScheme, setSessionColorScheme } from '@/core/theme/sessionColorScheme';
import { api } from '@/shared/api';

import { AuthProvider, useAuth } from '../AuthContext';

import type { ReactNode } from 'react';

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
