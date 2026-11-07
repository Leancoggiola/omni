import { changePasswordSchema } from '@omni/shared/users';

import type { ChangePasswordPayload, UserProfile } from '@omni/shared/users';

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

export const BIRTH_DATE_PLACEHOLDER = 'dd/mm/aaaa';
export const BIRTH_DATE_INVALID_MESSAGE = 'Ingresá una fecha válida (dd/mm/aaaa)';
const BIRTH_DATE_MIN_YEAR = 1900;

/** Pasa lo que escribe el usuario a `dd/mm/aaaa`: solo dígitos (hasta 8) con las barras puestas solas. */
export const maskBirthDateInput = (text: string): string => {
  const digits = text.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
};

/** `dd/mm/aaaa` de la fecha de nacimiento del perfil (día de calendario, sin corrimiento por zona horaria). */
export const birthDateToDisplay = (birthDate: UserProfile['birthDate'] | undefined): string => {
  const match = birthDate?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : '';
};

/**
 * Día elegido (YYYY-MM-DD) a partir de `dd/mm/aaaa`: `null` si está vacío (borra la fecha) y `undefined` si no es una
 * fecha real, desde 1900 y no futura.
 */
export const parseBirthDateInput = (display: string, today: Date = new Date()): string | null | undefined => {
  if (display.trim() === '') return null;
  const match = display.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return undefined;

  const [day, month, year] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  const isRealDate = date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  if (!isRealDate || year < BIRTH_DATE_MIN_YEAR) return undefined;

  const iso = `${match[3]}-${match[2]}-${match[1]}`;
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  return iso > todayIso ? undefined : iso;
};
