import { act, renderHook, waitFor } from '@testing-library/react-native';
import { SWRConfig } from 'swr';
import useSWRImmutable from 'swr/immutable';

import { api } from '@/shared/api';
import { API_KEYS } from '@/shared/api/keys';

import { useProfile } from './hooks';

import type { ProfileResponse } from '@omni/shared/auth';
import type { UserPreferences, UserProfile } from '@omni/shared/users';
import type { PropsWithChildren } from 'react';

jest.mock('@/shared/api', () => ({
  api: { patch: jest.fn() },
  API_KEYS: jest.requireActual('@/shared/api/keys').API_KEYS,
}));

const mockPatch = jest.mocked(api.patch);

const PREFERENCES: UserPreferences = {
  id: 'p1',
  userId: 'u1',
  notifications: false,
  theme: 'light',
  createdAt: '',
  updatedAt: '',
};

const PROFILE: UserProfile = {
  id: 'u1',
  username: 'admin',
  name: 'Admin Omni',
  email: 'admin@omni.dev',
  role: 'ADMIN',
  avatarUrl: null,
  phone: '123',
  birthDate: null,
  createdAt: '',
  updatedAt: '',
  preferences: PREFERENCES,
};

const SESSION: ProfileResponse = {
  user: {
    username: 'admin',
    name: 'Admin Omni',
    email: 'admin@omni.dev',
    role: 'ADMIN',
    avatarUrl: null,
    theme: 'light',
  },
};

/** Cache aislado por test, con el perfil y la sesión ya cargados (como tras el primer fetch) y un fetcher que falla. */
function setup() {
  const failingFetcher = jest.fn().mockRejectedValue(new Error('sin red'));
  const cache = new Map<string, unknown>([
    [API_KEYS.users.profile, { data: { user: PROFILE } }],
    [API_KEYS.auth.profile, { data: SESSION }],
  ]);
  const wrapper = ({ children }: PropsWithChildren) => (
    <SWRConfig value={{ provider: () => cache as never, fetcher: failingFetcher }}>{children}</SWRConfig>
  );
  const hook = renderHook(
    () => ({ profile: useProfile(), session: useSWRImmutable<ProfileResponse>(API_KEYS.auth.profile) }),
    { wrapper }
  );
  return { ...hook, failingFetcher };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useProfile · updatePreferences', () => {
  it('escribe la preferencia guardada en el cache aunque la revalidación fallaría', async () => {
    mockPatch.mockResolvedValue({ preferences: { ...PREFERENCES, notifications: true } });
    const { result, failingFetcher } = setup();

    await act(async () => {
      await result.current.profile.updatePreferences({ notifications: true });
    });

    expect(mockPatch).toHaveBeenCalledWith(API_KEYS.users.preferences, { notifications: true });
    expect(result.current.profile.profile?.preferences?.notifications).toBe(true);
    // El valor sale de la respuesta del PATCH: no hace falta (ni se depende de) volver a pedir el perfil.
    expect(failingFetcher).not.toHaveBeenCalled();
  });

  it('con un cambio de tema también actualiza el tema de la sesión', async () => {
    mockPatch.mockResolvedValue({ preferences: { ...PREFERENCES, theme: 'dark' } });
    const { result } = setup();

    await act(async () => {
      await result.current.profile.updatePreferences({ theme: 'dark' });
    });

    await waitFor(() => expect(result.current.session.data?.user.theme).toBe('dark'));
    expect(result.current.profile.profile?.preferences?.theme).toBe('dark');
  });

  it('dos PATCH en paralelo: la respuesta más vieja no revierte el otro campo', async () => {
    // Cada respuesta trae el otro campo con el valor que tenía al procesarse.
    let finishTheme!: (value: { preferences: UserPreferences }) => void;
    mockPatch
      .mockImplementationOnce(() => new Promise(resolve => (finishTheme = resolve as typeof finishTheme)))
      .mockResolvedValueOnce({ preferences: { ...PREFERENCES, notifications: true } });
    const { result } = setup();

    await act(async () => {
      const theme = result.current.profile.updatePreferences({ theme: 'dark' });
      await result.current.profile.updatePreferences({ notifications: true });
      finishTheme({ preferences: { ...PREFERENCES, theme: 'dark' } });
      await theme;
    });

    expect(result.current.profile.profile?.preferences).toMatchObject({ notifications: true, theme: 'dark' });
  });

  it('sin cambio de tema no toca la sesión', async () => {
    mockPatch.mockResolvedValue({ preferences: { ...PREFERENCES, notifications: true } });
    const { result } = setup();

    await act(async () => {
      await result.current.profile.updatePreferences({ notifications: true });
    });

    expect(result.current.session.data).toEqual(SESSION);
  });

  it('si el PATCH falla rechaza y deja el cache como estaba', async () => {
    mockPatch.mockRejectedValue(new Error('No hay red'));
    const { result } = setup();

    await act(async () => {
      await expect(result.current.profile.updatePreferences({ notifications: true })).rejects.toThrow('No hay red');
    });

    expect(result.current.profile.profile?.preferences?.notifications).toBe(false);
  });
});

describe('useProfile · updateProfile', () => {
  it('guarda el teléfono y sincroniza la sesión', async () => {
    mockPatch.mockResolvedValue({ user: { ...PROFILE, phone: '456' } });
    const { result } = setup();

    await act(async () => {
      await result.current.profile.updateProfile({ phone: '456' });
    });

    expect(mockPatch).toHaveBeenCalledWith(API_KEYS.users.profile, { phone: '456' });
    expect(result.current.profile.profile?.phone).toBe('456');
  });
});
