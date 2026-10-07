import useSWRImmutable from 'swr/immutable';
import { useSWRConfig } from 'swr';

import { api, API_KEYS } from '@/shared/api';
import { toSessionUser } from '@omni/shared/auth';

import type { UpdatePreferencesPayload, UpdateProfilePayload, UserProfile } from '@omni/shared/users';

export function useProfile() {
  const { mutate: globalMutate } = useSWRConfig();
  const { data, error, isLoading, mutate, isValidating } = useSWRImmutable<{ user: UserProfile }>(
    API_KEYS.users.profile
  );

  const updateProfile = async (payload: UpdateProfilePayload) => {
    const res = await api.patch<{ user: UserProfile }>(API_KEYS.users.profile, payload);
    await mutate(res, { revalidate: false });
    await globalMutate(API_KEYS.auth.profile, { user: toSessionUser(res.user) }, { revalidate: false });
    return res;
  };

  const updatePreferences = async (payload: UpdatePreferencesPayload) => {
    const res = await api.patch(API_KEYS.users.preferences, payload);
    const fresh = await mutate();
    // El tema efectivo sale de la sesión (core/theme), así que hay que reflejarlo ahí también.
    if (payload.theme && fresh) {
      await globalMutate(API_KEYS.auth.profile, { user: toSessionUser(fresh.user) }, { revalidate: false });
    }
    return res;
  };

  return {
    profile: data?.user ?? null,
    error,
    isLoading,
    isMutating: isValidating,
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
