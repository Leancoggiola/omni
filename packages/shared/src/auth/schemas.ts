import { z } from 'zod';

import { TOKEN_MAX_LENGTH } from '../common/limits';
import { newPasswordSchema } from '../users/schemas';

export const usernameSchema = z
  .string()
  .min(6, { error: 'Debe tener al menos 6 caracteres' })
  .max(20, { error: 'No puede tener más de 20 caracteres' })
  .regex(/^[a-zA-Z0-9]+$/, {
    error: 'Solo se permiten letras y números',
  })
  .transform(val => val.toLowerCase());

export const loginSchema = z.object({
  username: usernameSchema,
  password: z.string().min(1, { error: 'La contraseña es requerida' }),
});
export type LoginPayload = z.infer<typeof loginSchema>;

export const createUserSchema = z.object({
  username: usernameSchema,
  name: z.string().min(2, { error: 'Debe tener al menos 2 caracteres' }),
  password: newPasswordSchema,
  email: z.email({ error: 'Email inválido' }).optional(),
  role: z.enum(['ADMIN', 'USER']).default('USER').optional(),
});
export type CreateUserPayload = z.infer<typeof createUserSchema>;

/** Valores crudos del form "Crear usuario" de web: strings (el email vacío es "sin email") + confirmación. */
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

/**
 * Body opcional de refresh y logout. Mobile manda acá su refresh token; la web no manda body y usa la cookie.
 * En el logout, el token del body tiene prioridad sobre la cookie.
 */
export const refreshTokenBodySchema = z
  .object({
    refreshToken: z.string().min(1).max(TOKEN_MAX_LENGTH).optional(),
  })
  .default({});
export type RefreshTokenBody = z.infer<typeof refreshTokenBodySchema>;
