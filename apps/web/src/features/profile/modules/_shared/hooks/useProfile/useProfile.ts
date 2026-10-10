import { useCallback } from 'react';
import { useSWRConfig } from 'swr';
import useSWRImmutable from 'swr/immutable';
import useSWRMutation from 'swr/mutation';

import { api, SWR_KEYS } from '@/shared/api';

import type { ProfileResponse } from '@omni/shared/auth';
import type { UpdatePreferencesPayload, UpdateProfilePayload, UserPreferences, UserProfile } from '@omni/shared/users';

import { toSessionUser } from '@omni/shared/auth';

export function useProfile() {
  const { mutate: globalMutate } = useSWRConfig();
  const { data, isLoading, error, mutate } = useSWRImmutable<{ user: UserProfile }>(SWR_KEYS.users.profile);

  const syncAuthCache = useCallback(
    (profile: UserProfile) => {
      void globalMutate<ProfileResponse>(
        SWR_KEYS.auth.profile,
        { user: toSessionUser(profile) },
        { revalidate: false }
      );
    },
    [globalMutate]
  );

  const { trigger: updateProfile, isMutating: isUpdatingProfile } = useSWRMutation(
    SWR_KEYS.users.profile,
    (_url: string, { arg }: { arg: UpdateProfilePayload }) =>
      api.patch<{ user: UserProfile }>(SWR_KEYS.users.profile, arg),
    {
      populateCache: (updated, current) => {
        if (current?.user?.preferences && !updated.user.preferences) {
          return { user: { ...updated.user, preferences: current.user.preferences } };
        }
        return updated;
      },
      revalidate: false,
      onSuccess: data => syncAuthCache(data.user),
    }
  );

  const { trigger: updatePreferences, isMutating: isUpdatingPreferences } = useSWRMutation(
    SWR_KEYS.users.preferences,
    async (_url: string, { arg }: { arg: UpdatePreferencesPayload }) => {
      const res = await api.patch<{ preferences: UserPreferences }>(SWR_KEYS.users.preferences, arg);
      await mutate(
        current =>
          current
            ? {
                user: {
                  ...current.user,
                  preferences: current.user.preferences
                    ? { ...current.user.preferences, ...res.preferences }
                    : res.preferences,
                },
              }
            : current,
        { revalidate: false }
      );
      if (arg.theme !== undefined) {
        void globalMutate<ProfileResponse>(
          SWR_KEYS.auth.profile,
          current => (current ? { ...current, user: { ...current.user, theme: res.preferences.theme } } : current),
          { revalidate: false }
        );
      }
      return res.preferences;
    }
  );

  return {
    profile: data?.user ?? null,
    isLoading,
    isMutating: isUpdatingProfile || isUpdatingPreferences,
    error,
    updateProfile,
    updatePreferences,
  };
}
