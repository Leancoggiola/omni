import { SWRConfig } from 'swr';
import useSWRImmutable from 'swr/immutable';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SWR_KEYS } from '@/shared/api';

import { useProfile } from '../hooks/useProfile';

import type { ProfileResponse } from '@omni/shared/auth';
import type { UserProfile } from '@omni/shared/users';
import type { ReactNode } from 'react';

import { act, renderHook, waitFor } from '@testing-library/react';

const patch = vi.fn();
const put = vi.fn();
const del = vi.fn();

vi.mock('@/shared/api', async importOriginal => ({
  ...(await importOriginal<typeof import('@/shared/api')>()),
  api: {
    patch: (...args: unknown[]) => patch(...args),
    put: (...args: unknown[]) => put(...args),
    delete: (...args: unknown[]) => del(...args),
  },
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
    put.mockReset();
    del.mockReset();
  });

  it('subir la foto manda un FormData con el campo avatar y actualiza perfil y sesión', async () => {
    const url = 'https://cdn.test/u1/a.png';
    put.mockResolvedValue({ user: { ...profile, avatarUrl: url } });
    const { result } = renderHook(() => useProfileAndSession(), { wrapper });
    await waitFor(() => expect(result.current.profile).not.toBeNull());
    await waitFor(() => expect(result.current.auth).toBeDefined());
    const file = new File(['x'], 'a.png', { type: 'image/png' });

    await act(() => result.current.uploadAvatar(file));

    const [path, form] = put.mock.calls[0] as [string, FormData];
    expect(path).toBe(SWR_KEYS.users.avatar);
    expect(form.get('avatar')).toBeInstanceOf(File);
    expect(result.current.profile?.avatarUrl).toBe(url);
    expect(result.current.auth?.user.avatarUrl).toBe(url);
  });

  it('quitar la foto deja avatarUrl en null en perfil y sesión', async () => {
    del.mockResolvedValue({ user: { ...profile, avatarUrl: null } });
    const { result } = renderHook(() => useProfileAndSession(), { wrapper });
    await waitFor(() => expect(result.current.profile).not.toBeNull());

    await act(() => result.current.removeAvatar());

    expect(del).toHaveBeenCalledWith(SWR_KEYS.users.avatar);
    expect(result.current.profile?.avatarUrl).toBeNull();
    expect(result.current.auth?.user.avatarUrl).toBeNull();
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
