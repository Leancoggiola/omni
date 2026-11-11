import { z } from 'zod';

import type { UserProfile } from './types';

/** Nombre del campo multipart de `PUT /api/users/avatar`: la API lo exige y los clientes lo usan al armar el `FormData`. */
export const AVATAR_FIELD = 'avatar';

/** Peso máximo de la foto de perfil: la API corta el upload al pasarlo (413) y los selectores de imagen lo validan antes de subir. */
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

/** Formatos admitidos. Sin GIF: una foto animada no tiene sentido como avatar y agranda el archivo. */
export const AVATAR_ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type AvatarMime = (typeof AVATAR_ALLOWED_MIME)[number];

/** `true` si el tipo que declara el selector de imágenes es uno de `AVATAR_ALLOWED_MIME`; la API igual valida el contenido. */
export function isAvatarMime(value: string | null | undefined): value is AvatarMime {
  return AVATAR_ALLOWED_MIME.some(mime => mime === value);
}

/**
 * Respuesta de `PUT` y `DELETE /api/users/avatar`: el perfil completo, igual que `PATCH /api/users/profile`, para que
 * los clientes reemplacen su caché de `users.profile` sin otro request. Valida solo lo que cambia (`avatarUrl`).
 */
export const avatarResponseSchema = z.object({
  user: z.object({ avatarUrl: z.url().nullable() }).loose(),
});
export interface AvatarResponse {
  user: UserProfile;
}
