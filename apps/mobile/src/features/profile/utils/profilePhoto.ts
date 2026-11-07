export const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/gif'];
export const AVATAR_TYPE_ERROR = 'Elegí una imagen JPG, PNG o GIF';
export const AVATAR_SIZE_ERROR = 'La imagen no puede pesar más de 5MB';

type PickedAsset = { mimeType?: string | null; fileSize?: number | null };

/** Mismos límites que `ProfilePhotoSection` de web: JPG, PNG o GIF de hasta 5MB. Devuelve el error o `null`. */
export const validateAvatarAsset = ({ mimeType, fileSize }: PickedAsset): string | null => {
  if (mimeType && !ACCEPTED_AVATAR_TYPES.includes(mimeType)) return AVATAR_TYPE_ERROR;
  if (fileSize && fileSize > MAX_AVATAR_SIZE_BYTES) return AVATAR_SIZE_ERROR;
  return null;
};
