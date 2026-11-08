import { randomUUID } from 'node:crypto';

import { prisma } from '../common/db';
import { HttpError } from '../common/http';
import { getAvatarStorage } from '../common/storage';
import { logger } from '../common/utils';
import { detectAvatarImage } from './avatar-image';

const AVATAR_FORMAT_MESSAGE = 'Formato de imagen no admitido: usá JPG, PNG o WebP';

async function findUserWithAvatar(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    omit: { password: true },
    include: { preferences: true },
  });
  if (!user) throw new HttpError(404, 'Usuario no encontrado');
  return user;
}

/**
 * Borra del storage el objeto al que apunta `avatarUrl`, sin fallar nunca: una foto que queda huérfana cuesta espacio,
 * pero no puede romper el cambio de foto ni el borrado de la cuenta. Solo toca objetos de este bucket que cuelguen de
 * la carpeta del propio usuario (`<userId>/…`): una URL externa o ajena se ignora.
 */
export async function discardAvatarObject(userId: string, avatarUrl: string | null): Promise<void> {
  if (!avatarUrl) return;
  try {
    const storage = getAvatarStorage();
    const path = storage.pathFromUrl(avatarUrl);
    if (!path?.startsWith(`${userId}/`)) return;
    await storage.remove(path);
  } catch (err) {
    logger.warn({ err, userId }, 'No se pudo borrar una foto de perfil del storage');
  }
}

/**
 * Reemplaza la foto de perfil: valida el formato por los bytes (415), sube a un path nuevo `<userId>/<uuid>.<ext>`
 * (la URL cambia en cada subida, así ningún caché sirve la foto vieja), guarda la URL en `User.avatarUrl` y recién
 * entonces borra el objeto anterior. Si la base falla se borra el objeto recién subido y el anterior queda intacto.
 * Dos reemplazos simultáneos del mismo usuario pueden dejar un objeto huérfano; el rate limiter de la ruta lo acota.
 */
export async function replaceAvatar(userId: string, file: Buffer) {
  const image = detectAvatarImage(file);
  if (!image) throw new HttpError(415, AVATAR_FORMAT_MESSAGE);

  const storage = getAvatarStorage();
  const { avatarUrl: previousUrl } = await findUserWithAvatar(userId);

  const avatarUrl = await storage.upload({
    path: `${userId}/${randomUUID()}.${image.extension}`,
    body: file,
    contentType: image.mime,
  });

  let user;
  try {
    user = await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
      omit: { password: true },
      include: { preferences: true },
    });
  } catch (err) {
    await discardAvatarObject(userId, avatarUrl);
    throw err;
  }

  await discardAvatarObject(userId, previousUrl);
  return user;
}

/** Quita la foto: `avatarUrl` pasa a `null` y se borra el objeto. Sin foto es un no-op que devuelve el perfil. */
export async function removeAvatar(userId: string) {
  const current = await findUserWithAvatar(userId);
  if (!current.avatarUrl) return current;

  const user = await prisma.user.update({
    where: { id: userId },
    data: { avatarUrl: null },
    omit: { password: true },
    include: { preferences: true },
  });

  await discardAvatarObject(userId, current.avatarUrl);
  return user;
}
