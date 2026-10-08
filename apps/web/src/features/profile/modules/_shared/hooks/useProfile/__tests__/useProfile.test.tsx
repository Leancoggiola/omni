import { SWRConfig } from 'swr';
import useSWRImmutable from 'swr/immutable';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SWR_KEYS } from '@/shared/api';

import { useProfile } from '../useProfile';

import type { ProfileResponse } from '@omni/shared/auth';
import type { UserProfile } from '@omni/shared/users';
import type { ReactNode } from 'react';

import { act, renderHook, waitFor } from '@testing-library/react';

const patch = vi.fn();

vi.mock('@/shared/api', async importOriginal => ({
  ...(await importOriginal<typeof import('@/shared/api')>()),
  api: { patch: (...args: unknown[]) => patch(...args) },
}));

const preferences = {
  id: 'p1',
  userId: 'u1',
  notifications: false,
  theme: 'light' as const,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const profile: UserProfile = {
  id: 'u1',
  username: 'maria',
  name: 'María',
  email: null,
  role: 'USER',
  avatarUrl: null,
  phone: null,
  birthDate: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  preferences,
};

const session: ProfileResponse = {
  user: { username: 'maria', name: 'María', email: null, role: 'USER', avatarUrl: null, theme: 'light' },
};

const fetcher = (key: string) => Promise.resolve(key === SWR_KEYS.users.profile ? { user: profile } : session);

function wrapper({ children }: { children: ReactNode }) {
  return <SWRConfig value={{ provider: () => new Map(), fetcher }}>{children}</SWRConfig>;
}

function useProfileAndSession() {
  const { data: auth } = useSWRImmutable<ProfileResponse>(SWR_KEYS.auth.profile);
  return { ...useProfile(), auth };
}

describe('useProfile', () => {
  beforeEach(() => {
    patch.mockReset();
  });

  it('al guardar el tema también actualiza el usuario de la sesión', async () => {
    patch.mockResolvedValue({ preferences: { ...preferences, theme: 'dark' } });
    const { result } = renderHook(() => useProfileAndSession(), { wrapper });
    await waitFor(() => expect(result.current.profile).not.toBeNull());
    await waitFor(() => expect(result.current.auth?.user.theme).toBe('light'));

    await act(() => result.current.updatePreferences({ theme: 'dark' }));

    expect(result.current.profile?.preferences?.theme).toBe('dark');
    expect(result.current.auth?.user.theme).toBe('dark');
  });

  it('guardar otras preferencias no toca la cache de la sesión', async () => {
    patch.mockResolvedValue({ preferences: { ...preferences, notifications: true } });
    const { result } = renderHook(() => useProfileAndSession(), { wrapper });
    await waitFor(() => expect(result.current.auth).toBeDefined());
    const authBefore = result.current.auth;

    await act(() => result.current.updatePreferences({ notifications: true }));

    expect(result.current.profile?.preferences?.notifications).toBe(true);
    expect(result.current.auth).toBe(authBefore);
  });
});
