import { z } from 'zod';

import type { CreateUserPayload } from '@omni/shared/auth';

import { createUserSchema, usernameSchema } from '@omni/shared/auth';

export interface CreateUserFormValues {
  username: string;
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export const createUserFormSchema: z.ZodType<CreateUserFormValues> = z
  .object({
    username: z.string().trim().pipe(usernameSchema),
    name: z.string().trim().min(2, { error: 'Debe tener al menos 2 caracteres' }),
    email: z
      .string()
      .trim()
      .refine(value => value === '' || z.email().safeParse(value).success, { error: 'Email inválido' }),
    password: createUserSchema.shape.password,
    confirmPassword: z.string(),
  })
  .refine(values => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    error: 'Las contraseñas no coinciden',
  });

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
