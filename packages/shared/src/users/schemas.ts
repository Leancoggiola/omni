import { z } from 'zod';

/** Largo máximo del teléfono: los formularios lo usan como `maxLength`. */
export const PHONE_MAX_LENGTH = 30;

/** Self-service profile updates. Name and email are immutable after registration. */
export const updateProfileSchema = z
  .object({
    phone: z.string().max(PHONE_MAX_LENGTH).optional().nullable(),
    birthDate: z.iso.datetime().optional().nullable(),
  })
  .strict();
export type UpdateProfilePayload = z.infer<typeof updateProfileSchema>;

export const changePasswordSchema = z.object({
  newPassword: z.string().min(8),
});
export type ChangePasswordPayload = z.infer<typeof changePasswordSchema>;

export const profileThemeSchema = z.enum(['light', 'dark', 'auto']);

export const updatePreferencesSchema = z
  .object({
    notifications: z.boolean().optional(),
    theme: profileThemeSchema.optional(),
  })
  .strict();
export type UpdatePreferencesPayload = z.infer<typeof updatePreferencesSchema>;
export type ProfileTheme = z.infer<typeof profileThemeSchema>;

export const PROFILE_THEME_OPTIONS = [
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Oscuro' },
  { value: 'auto', label: 'Sistema' },
] as const satisfies readonly { value: ProfileTheme; label: string }[];
