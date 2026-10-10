import { SWRConfig } from 'swr';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { setSessionColorScheme } from '@/core/theme/sessionColorScheme';
import { useSyncColorScheme } from '@/core/theme/useSyncColorScheme';
import { api } from '@/shared/api';

import { AuthProvider, useAuth } from '../AuthContext';

import type { ReactNode } from 'react';

import { act, renderHook, waitFor } from '@testing-library/react';

const setColorScheme = vi.fn();

vi.mock('@mantine/core', () => ({
  useMantineColorScheme: () => ({ setColorScheme }),
}));

vi.mock('@/shared/api', async importOriginal => {
  const actual = await importOriginal<typeof import('@/shared/api')>();
  return { ...actual, api: { post: vi.fn() } };
});

const wrapper = ({ children }: { children: ReactNode }) => (
  <SWRConfig value={{ provider: () => new Map(), fetcher: () => Promise.resolve(undefined) }}>
    <AuthProvider>{children}</AuthProvider>
  </SWRConfig>
);

/** Contrato entre AuthProvider (descarta el override) y useSyncColorScheme (aplica el tema). */
describe('login + useSyncColorScheme', () => {
  beforeEach(() => {
    sessionStorage.clear();
    setColorScheme.mockClear();
    vi.mocked(api.post)
      .mockReset()
      .mockResolvedValue({ user: { id: 'u1', theme: 'light' } });
  });

  it('con un override de sesión previo, el login aplica el tema del perfil y no el override', async () => {
    setSessionColorScheme('dark');
    const { result } = renderHook(
      () => {
        useSyncColorScheme();
        return useAuth();
      },
      { wrapper }
    );

    await act(() => result.current.login('maria', 'secreto'));

    await waitFor(() => expect(setColorScheme).toHaveBeenCalled());
    expect(setColorScheme).toHaveBeenLastCalledWith('light');
  });
});
