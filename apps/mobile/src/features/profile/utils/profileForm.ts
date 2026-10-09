import { changePasswordSchema } from '@omni/shared/users';

import type { UpdateProfilePayload, UserProfile } from '@omni/shared/users';

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

export type PasswordFormErrors = Partial<Record<'newPassword' | 'confirmPassword', string>>;

const TOO_SHORT = 'La contraseña debe tener al menos 8 caracteres';
const INVALID = 'La contraseña no es válida';

/** Primer error del schema compartido para una contraseña; los mensajes de zod salen en inglés (sin locale). */
const passwordError = (value: string): string | undefined => {
  const result = changePasswordSchema.shape.newPassword.safeParse(value);
  if (result.success) return undefined;
  return result.error.issues[0]?.code === 'too_small' ? TOO_SHORT : INVALID;
};

/** Mismas reglas que `PasswordForm` de web; la regla de la contraseña sale del schema compartido. */
export const validatePasswordForm = (newPassword: string, confirmPassword: string): PasswordFormErrors => {
  const errors: PasswordFormErrors = {};

  const newPasswordError = passwordError(newPassword);
  if (newPasswordError) errors.newPassword = newPasswordError;

  const confirmError = passwordError(confirmPassword);
  if (confirmError) errors.confirmPassword = confirmError;
  else if (confirmPassword !== newPassword) errors.confirmPassword = 'Las contraseñas no coinciden';

  return errors;
};
