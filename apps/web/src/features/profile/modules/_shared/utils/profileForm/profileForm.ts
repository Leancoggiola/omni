import { extractIsoDateKey, parseIsoDateStringToDate } from '@/shared/dates';

import type { ProfileTheme, UpdatePreferencesPayload, UpdateProfilePayload, UserProfile } from '@omni/shared/users';

import { buildProfileUpdates as buildSharedProfileUpdates } from '@omni/shared/users';

export interface ProfileFormValues {
  phone: string;
  birthDate: Date | null;
  notifications: boolean;
  theme: ProfileTheme;
}

export const toProfileFormValues = (profile: UserProfile): ProfileFormValues => ({
  phone: profile.phone ?? '',
  birthDate: profile.birthDate ? parseIsoDateStringToDate(profile.birthDate) : null,
  notifications: profile.preferences?.notifications ?? false,
  theme: profile.preferences?.theme ?? 'light',
});

/** `buildProfileUpdates` de `@omni/shared/users` con la fecha del `DatePicker` pasada a día de calendario. */
export const buildProfileUpdates = (profile: UserProfile, values: ProfileFormValues): UpdateProfilePayload =>
  buildSharedProfileUpdates(profile, { phone: values.phone, birthDate: extractIsoDateKey(values.birthDate) });

export const buildPreferencesUpdates = (profile: UserProfile, values: ProfileFormValues): UpdatePreferencesPayload => {
  const prefs = profile.preferences;
  const updates: UpdatePreferencesPayload = {};
  const currentTheme = prefs?.theme ?? 'light';

  if (values.notifications !== (prefs?.notifications ?? false)) {
    updates.notifications = values.notifications;
  }
  if (values.theme !== currentTheme) {
    updates.theme = values.theme;
  }

  return updates;
};
