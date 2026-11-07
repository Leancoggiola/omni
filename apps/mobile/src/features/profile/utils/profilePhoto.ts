import { AVATAR_FIELD, AVATAR_MAX_BYTES, isAvatarMime } from '@omni/shared/users';

export const AVATAR_TYPE_ERROR = 'Elegí una imagen JPG, PNG o WebP';
export const AVATAR_SIZE_ERROR = 'La imagen no puede pesar más de 2MB';

export type AvatarAsset = { uri: string; mimeType?: string | null; fileSize?: number | null; fileName?: string | null };

/**
 * Mismos límites que la API (`AVATAR_ALLOWED_MIME` y `AVATAR_MAX_BYTES` de `@omni/shared/users`): JPG, PNG o WebP de
 * hasta 2MB. Si el selector no informa tipo o peso no se rechaza: la API valida el contenido. Devuelve el error o `null`.
 */
export const validateAvatarAsset = ({
  mimeType,
  fileSize,
}: Pick<AvatarAsset, 'mimeType' | 'fileSize'>): string | null => {
  if (mimeType && !isAvatarMime(mimeType)) return AVATAR_TYPE_ERROR;
  if (fileSize && fileSize > AVATAR_MAX_BYTES) return AVATAR_SIZE_ERROR;
  return null;
};

/**
 * `FormData` de el PUT del avatar: React Native lee el archivo desde su `uri` cuando se agrega como
 * `{ uri, name, type }`, de ahí el cast (no es un `Blob` real).
 */
export const buildAvatarForm = ({ uri, mimeType, fileName }: AvatarAsset): FormData => {
  const form = new FormData();
  form.append(AVATAR_FIELD, { uri, name: fileName ?? 'avatar', type: mimeType ?? 'image/jpeg' } as unknown as Blob);
  return form;
};
