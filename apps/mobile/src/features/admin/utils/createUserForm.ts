import { createUserSchema, usernameSchema } from '@omni/shared/auth';

import type { CreateUserPayload } from '@omni/shared/auth';

export type CreateUserFormValues = {
  username: string;
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
};

export type CreateUserFormErrors = Partial<Record<keyof CreateUserFormValues, string>>;

export const INITIAL_CREATE_USER_FORM_VALUES: CreateUserFormValues = {
  username: '',
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
};

const firstIssue = (result: { success: boolean; error?: { issues: { message: string }[] } }) =>
  result.success ? undefined : result.error?.issues[0]?.message;

/**
 * Mismas reglas que `createUserFormSchema` de web, con los schemas de `@omni/shared/auth` (mobile no depende de
 * zod): usuario, nombre de 2 o más, email opcional, contraseña inicial y confirmación igual.
 */
export function validateCreateUserForm(values: CreateUserFormValues): CreateUserFormErrors {
  const errors: CreateUserFormErrors = {};

  const username = firstIssue(usernameSchema.safeParse(values.username.trim()));
  if (username) errors.username = username;

  const name = firstIssue(createUserSchema.shape.name.safeParse(values.name.trim()));
  if (name) errors.name = name;

  const email = values.email.trim();
  if (email !== '' && !createUserSchema.shape.email.safeParse(email).success) errors.email = 'Email inválido';

  const password = firstIssue(createUserSchema.shape.password.safeParse(values.password));
  if (password) errors.password = password;

  if (values.password !== values.confirmPassword) errors.confirmPassword = 'Las contraseñas no coinciden';

  return errors;
}

/** Nunca envía `role`: la pantalla solo crea usuarios USER (default de la API). */
export function toCreateUserPayload(values: CreateUserFormValues): CreateUserPayload {
  const email = values.email.trim();

  return {
    username: values.username.trim(),
    name: values.name.trim(),
    password: values.password,
    ...(email ? { email } : {}),
  };
}
