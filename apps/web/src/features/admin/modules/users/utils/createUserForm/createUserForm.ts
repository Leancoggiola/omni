import type { CreateUserFormValues, CreateUserPayload } from '@omni/shared/auth';

import { createUserFormSchema } from '@omni/shared/auth';

export const INITIAL_CREATE_USER_FORM_VALUES: CreateUserFormValues = {
  username: '',
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
};

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

export { createUserFormSchema };
export type { CreateUserFormValues };
