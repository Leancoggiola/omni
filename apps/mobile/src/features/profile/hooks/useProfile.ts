import { useSWRConfig } from 'swr';
import useSWRImmutable from 'swr/immutable';

import { api, API_KEYS } from '@/shared/api';
import { toSessionUser } from '@omni/shared/auth';

import { buildAvatarForm } from '../utils/profilePhoto';

import type { ProfileResponse } from '@omni/shared/auth';
import type {
  AvatarResponse,
  UpdatePreferencesPayload,
  UpdateProfilePayload,
  UserPreferences,
  UserProfile,
} from '@omni/shared/users';
import type { AvatarAsset } from '../utils/profilePhoto';

export function useProfile() {
  const { mutate: globalMutate } = useSWRConfig();
  const { data, error, isLoading, mutate } = useSWRImmutable<{ user: UserProfile }>(API_KEYS.users.profile);

  const storeProfile = async (res: { user: UserProfile }) => {
    await mutate(res, { revalidate: false });
    await globalMutate(API_KEYS.auth.profile, { user: toSessionUser(res.user) }, { revalidate: false });
    return res;
  };

  const updateProfile = async (payload: UpdateProfilePayload) =>
    storeProfile(await api.patch<{ user: UserProfile }>(API_KEYS.users.profile, payload));

  /** Sube la foto (el PUT del avatar) y reemplaza el perfil y la sesión con la respuesta, sin otro request. */
  const uploadAvatar = async (asset: AvatarAsset) =>
    storeProfile(await api.put<AvatarResponse>(API_KEYS.users.avatar, buildAvatarForm(asset)));

  /** Quita la foto (el DELETE del avatar) y reemplaza el perfil y la sesión con la respuesta. */
  const removeAvatar = async () => storeProfile(await api.delete<AvatarResponse>(API_KEYS.users.avatar));

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
    uploadAvatar,
    removeAvatar,
  };
}
