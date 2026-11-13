import { AVATAR_FIELD, AVATAR_MAX_BYTES, isAvatarMime } from '@omni/shared/users';

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
 * Lee el archivo local como bytes con `XMLHttpRequest` (`responseType: 'blob'`, que RN resuelve para `file://` y
 * `content://`) y `FileReader`: no depende de `fetch`, que con `expo/fetch` (SDK 56) no abre URIs locales.
 */
const readFileBytes = (uri: string): Promise<Uint8Array> =>
  new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.responseType = 'blob';
    request.onerror = () => reject(new Error(AVATAR_READ_ERROR));
    request.onload = () => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error(AVATAR_READ_ERROR));
      reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
      reader.readAsArrayBuffer(request.response as Blob);
    };
    request.open('GET', uri);
    request.send();
  });

/**
 * `FormData` del PUT del avatar, válido para el `fetch` de React Native y para `expo/fetch` (SDK 56). La parte lleva
 * `uri`, `name` y `type` enumerables: el `FormData` de RN los copia y el `fetch` de RN sube el archivo desde la `uri`.
 * Además lleva `bytes()` no enumerable (RN no lo copia): `expo/fetch` no entiende `uri` y, ante una parte con `bytes`,
 * lee el contenido de ahí y arma el multipart con `name` y `type`.
 */
export const buildAvatarForm = ({ uri, mimeType, fileName }: AvatarAsset): FormData => {
  const part = { uri, name: fileName ?? 'avatar', type: mimeType ?? 'image/jpeg' };
  Object.defineProperty(part, 'bytes', { value: () => readFileBytes(uri) });
  const form = new FormData();
  form.append(AVATAR_FIELD, part as unknown as Blob);
  return form;
};
