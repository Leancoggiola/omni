import type { CreateUserPayload } from '@omni/shared/auth';

import { createUserSchema } from '@omni/shared/auth';

export interface CreateUserFormValues {
  username: string;
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export const INITIAL_CREATE_USER_FORM_VALUES: CreateUserFormValues = {
  username: '',
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
};

interface FieldSchema {
  safeParse: (value: unknown) => { success: true } | { success: false; error: { issues: { message: string }[] } };
}

function fieldError(schema: FieldSchema, value: string, fallback: string): string | null {
  const parsed = schema.safeParse(value);
  return parsed.success ? null : (parsed.error.issues[0]?.message ?? fallback);
}

/** Reusa los campos de `createUserSchema`; `confirmPassword` es solo del cliente (ver packages/shared/CLAUDE.md). */
export const createUserFormValidators = {
  username: (value: string) => fieldError(createUserSchema.shape.username, value.trim(), 'Usuario inválido'),
  name: (value: string) => fieldError(createUserSchema.shape.name, value.trim(), 'Nombre inválido'),
  email: (value: string) =>
    value.trim() === '' ? null : fieldError(createUserSchema.shape.email, value.trim(), 'Email inválido'),
  password: (value: string) => fieldError(createUserSchema.shape.password, value, 'Contraseña inválida'),
  confirmPassword: (value: string, values: CreateUserFormValues) =>
    value === values.password ? null : 'Las contraseñas no coinciden',
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
