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

/**
 * Mismas reglas que `PasswordForm` de web. El mensaje del schema compartido sale en inglés (zod sin
 * locale), así que el de largo mínimo se fija acá.
 */
export const validatePasswordForm = (newPassword: string, confirmPassword: string): PasswordFormErrors => {
  const errors: PasswordFormErrors = {};

  if (!changePasswordSchema.safeParse({ newPassword }).success) errors.newPassword = TOO_SHORT;

  if (confirmPassword.length < 8) errors.confirmPassword = TOO_SHORT;
  else if (confirmPassword !== newPassword) errors.confirmPassword = 'Las contraseñas no coinciden';

  return errors;
};
