import type { AvatarMime } from '@omni/shared/users';

export interface AvatarImage {
  mime: AvatarMime;
  extension: 'jpg' | 'png' | 'webp';
}

const JPEG_SIGNATURE = [0xff, 0xd8, 0xff];
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const RIFF_TAG = 'RIFF';
const WEBP_TAG = 'WEBP';
const WEBP_TAG_OFFSET = 8;

function startsWith(buffer: Buffer, signature: readonly number[]): boolean {
  return buffer.length >= signature.length && signature.every((byte, index) => buffer[index] === byte);
}

/**
 * Formato real de la imagen según sus primeros bytes (JPEG, PNG o WebP), o `null` si no es uno de los admitidos. Ignora
 * el `Content-Type` del part y el nombre del archivo, que los elige el cliente: un GIF, un SVG o un ejecutable
 * declarados como `image/png` no pasan. Solo mira la firma; no decodifica la imagen.
 */
export function detectAvatarImage(buffer: Buffer): AvatarImage | null {
  if (startsWith(buffer, JPEG_SIGNATURE)) return { mime: 'image/jpeg', extension: 'jpg' };
  if (startsWith(buffer, PNG_SIGNATURE)) return { mime: 'image/png', extension: 'png' };
  if (
    buffer.length >= WEBP_TAG_OFFSET + WEBP_TAG.length &&
    buffer.toString('ascii', 0, RIFF_TAG.length) === RIFF_TAG &&
    buffer.toString('ascii', WEBP_TAG_OFFSET, WEBP_TAG_OFFSET + WEBP_TAG.length) === WEBP_TAG
  ) {
    return { mime: 'image/webp', extension: 'webp' };
  }
  return null;
}
