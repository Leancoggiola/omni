import { AVATAR_FIELD, AVATAR_MAX_BYTES, isAvatarMime } from '@omni/shared/users';
import { File } from 'expo-file-system';

export const AVATAR_TYPE_ERROR = 'Elegí una imagen JPG, PNG o WebP';
export const AVATAR_READ_ERROR = 'No se pudo leer la imagen elegida';
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
 * `File` de `expo-file-system` como parte de un `FormData`. `expo/fetch` reconoce el `File` de expo-file-system al
 * serializar el cuerpo (lee sus bytes y toma el nombre y el tipo del archivo), pero el tipo de `FormData.append`
 * de React Native solo acepta `Blob`: por eso el cast, que vive solo acá.
 */
const asFormPart = (file: File): Blob => file as unknown as Blob;

/**
 * `FormData` del PUT del avatar con el archivo elegido como `File` de `expo-file-system` (acepta `file://` y
 * `content://`): `expo/fetch` lo serializa leyendo sus bytes y toma el nombre y el tipo del propio archivo. Si no
 * existe o no se puede abrir lanza `AVATAR_READ_ERROR` acá, antes del PUT, para que no llegue al `fetch` ni se
 * reintente como un error de red. La API no mira nombre ni tipo declarados: detecta el formato por los bytes.
 */
export const buildAvatarForm = ({ uri }: Pick<AvatarAsset, 'uri'>): FormData => {
  let file: File;
  try {
    file = new File(uri);
  } catch {
    throw new Error(AVATAR_READ_ERROR);
  }
  if (!file.exists) throw new Error(AVATAR_READ_ERROR);
  const form = new FormData();
  form.append(AVATAR_FIELD, asFormPart(file));
  return form;
};
