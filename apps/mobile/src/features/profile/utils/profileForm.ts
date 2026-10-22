import { changePasswordSchema } from '@omni/shared/users';

import type { ChangePasswordPayload } from '@omni/shared/users';

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
