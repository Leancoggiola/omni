import { describe, expect, it } from 'vitest';

import { buildPreferencesUpdates, buildProfileUpdates, toProfileFormValues } from '../profileForm';

import type { UserProfile } from '@omni/shared/users';

const baseProfile: UserProfile = {
  id: '1',
  username: 'lean',
  name: 'Lean Jose',
  email: 'hallowed013@gmail.com',
  role: 'USER',
  avatarUrl: null,
  phone: null,
  birthDate: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  preferences: {
    id: 'p1',
    userId: '1',
    notifications: false,
    theme: 'light',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
};

describe('profileForm utils', () => {
  it('maps profile to form values', () => {
    const values = toProfileFormValues(baseProfile);
    expect(values.phone).toBe('');
    expect(values.theme).toBe('light');
  });

  it('builds profile updates only for changed fields', () => {
    const values = toProfileFormValues(baseProfile);
    values.phone = '+34 600 000 000';

    expect(buildProfileUpdates(baseProfile, values)).toEqual({
      phone: '+34 600 000 000',
    });
  });

  it('builds preferences updates only for changed fields', () => {
    const values = toProfileFormValues(baseProfile);
    values.notifications = true;
    values.theme = 'dark';

    expect(buildPreferencesUpdates(baseProfile, values)).toEqual({
      notifications: true,
      theme: 'dark',
    });
  });

  it('returns empty updates when nothing changed', () => {
    const values = toProfileFormValues(baseProfile);
    expect(buildProfileUpdates(baseProfile, values)).toEqual({});
    expect(buildPreferencesUpdates(baseProfile, values)).toEqual({});
  });

  it('builds birthDate update when changed', () => {
    const values = toProfileFormValues(baseProfile);
    values.birthDate = new Date(1990, 4, 15);

    expect(buildProfileUpdates(baseProfile, values)).toEqual({
      birthDate: '1990-05-15T00:00:00.000Z',
    });
  });

  it('does not update birthDate when calendar day is unchanged', () => {
    const profileWithBirthDate = { ...baseProfile, birthDate: '1990-05-15T03:00:00.000Z' };
    const values = toProfileFormValues(profileWithBirthDate);

    expect(buildProfileUpdates(profileWithBirthDate, values)).toEqual({});
  });

  it('clears phone when emptied', () => {
    const profileWithPhone = { ...baseProfile, phone: '+34 600 000 000' };
    const values = toProfileFormValues(profileWithPhone);
    values.phone = '';

    expect(buildProfileUpdates(profileWithPhone, values)).toEqual({
      phone: null,
    });
  });
});
