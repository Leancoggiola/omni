import useSWRImmutable from 'swr/immutable';
import { useSWRConfig } from 'swr';

import { api, API_KEYS } from '@/shared/api';
import { toSessionUser } from '@omni/shared/auth';

import type { ProfileResponse } from '@omni/shared/auth';
import type { UpdatePreferencesPayload, UpdateProfilePayload, UserPreferences, UserProfile } from '@omni/shared/users';

export function useProfile() {
  const { mutate: globalMutate } = useSWRConfig();
  const { data, error, isLoading, mutate } = useSWRImmutable<{ user: UserProfile }>(API_KEYS.users.profile);

  const updateProfile = async (payload: UpdateProfilePayload) => {
    const res = await api.patch<{ user: UserProfile }>(API_KEYS.users.profile, payload);
    await mutate(res, { revalidate: false });
    await globalMutate(API_KEYS.auth.profile, { user: toSessionUser(res.user) }, { revalidate: false });
    return res;
  };

  const updatePreferences = async (payload: UpdatePreferencesPayload) => {
    const res = await api.patch<{ preferences: UserPreferences }>(API_KEYS.users.preferences, payload);
    await mutate(
      current =>
        current && {
          user: { ...current.user, preferences: { ...(current.user.preferences ?? res.preferences), ...payload } },
        },
      { revalidate: false }
    );
    if (payload.theme) {
      const { theme } = payload;
      await globalMutate<ProfileResponse>(
        API_KEYS.auth.profile,
        current => current && { user: { ...current.user, theme } },
        { revalidate: false }
      );
    }
    return res;
  };

  return {
    profile: data?.user ?? null,
    error,
    isLoading,
    refresh: () => mutate(),
    updateProfile,
    updatePreferences,
  };
}

export function useAccountActions() {
  const changePassword = async (newPassword: string) => {
    await api.patch(API_KEYS.users.password, { newPassword });
  };

  const deleteAccount = async () => {
    await api.delete(API_KEYS.users.account);
  };

  return { changePassword, deleteAccount };
}
