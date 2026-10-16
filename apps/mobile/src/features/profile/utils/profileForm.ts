import { changePasswordSchema } from '@omni/shared/users';

import type { ChangePasswordPayload, UpdateProfilePayload, UserProfile } from '@omni/shared/users';

/** Teléfono vacío o con solo espacios = sin teléfono (`null`), como `buildProfileUpdates` de web. */
export const normalizePhone = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

/**
 * Campos de perfil que cambiaron. Vacío si no hay cambios: "Guardar cambios" queda deshabilitado. Solo
 * el teléfono es editable en mobile; la fecha de nacimiento (#38) no viaja en el PATCH.
 */
export const buildProfileUpdates = (profile: Pick<UserProfile, 'phone'>, phone: string): UpdateProfilePayload => {
  const normalized = normalizePhone(phone);
  return normalized === profile.phone ? {} : { phone: normalized };
};

export type PasswordFormErrors = Partial<Record<'currentPassword' | 'newPassword' | 'confirmPassword', string>>;

/** Primer mensaje del schema compartido para un campo del cambio de contraseña. */
const fieldError = (field: keyof ChangePasswordPayload, value: string): string | undefined => {
  const result = changePasswordSchema.shape[field].safeParse(value);
  return result.success ? undefined : result.error.issues[0]?.message;
};

/** Mismas reglas que `PasswordForm` de web; las reglas de las contraseñas salen del schema compartido. */
export const validatePasswordForm = (
  currentPassword: string,
  newPassword: string,
  confirmPassword: string
): PasswordFormErrors => {
  const errors: PasswordFormErrors = {};

  const currentError = fieldError('currentPassword', currentPassword);
  if (currentError) errors.currentPassword = currentError;

  const newPasswordError = fieldError('newPassword', newPassword);
  if (newPasswordError) errors.newPassword = newPasswordError;

  if (confirmPassword !== newPassword) errors.confirmPassword = 'Las contraseñas no coinciden';

  return errors;
};
