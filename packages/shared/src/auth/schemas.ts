import { z } from 'zod';

import { TOKEN_MAX_LENGTH } from '../common/limits';
import { newPasswordSchema } from '../users/schemas';
import { ROLES } from './types';

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
  role: z.enum(ROLES).optional(),
});
export type CreateUserPayload = z.infer<typeof createUserSchema>;

/**
 * Body opcional de refresh y logout. Mobile manda acá su refresh token; la web no manda body y usa la cookie.
 * En el logout, el token del body tiene prioridad sobre la cookie.
 */
export const refreshTokenBodySchema = z
  .object({
    refreshToken: z.string().min(1).max(TOKEN_MAX_LENGTH).optional(),
  })
  .default({});
