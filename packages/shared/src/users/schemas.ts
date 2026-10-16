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

/** Largo de la contraseña: el máximo es el de bcrypt, que trunca en silencio lo que pasa de 72. */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72;

/** Contraseña nueva de una cuenta: la comparten el alta de usuario y el cambio de contraseña. */
export const newPasswordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, { error: `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres` })
  .max(PASSWORD_MAX_LENGTH, { error: `La contraseña no puede tener más de ${PASSWORD_MAX_LENGTH} caracteres` });

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, { error: 'La contraseña actual es requerida' }),
  newPassword: newPasswordSchema,
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
