import type { NextFunction, Request, Response } from 'express';
import multer, { MulterError } from 'multer';
import { AVATAR_FIELD, AVATAR_MAX_BYTES } from '@omni/shared/users';

import { HttpError } from '../common/http';

const BYTES_PER_MB = 1024 * 1024;

const parseAvatar = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: AVATAR_MAX_BYTES, files: 1, fields: 0 },
}).single(AVATAR_FIELD);

/**
 * Traduce un fallo de `multer` a un `HttpError`: pasarse del tope es 413; un campo de archivo con otro nombre, 400, y
 * cualquier otro error del parser (multipart mal formado, cuerpo cortado) también es 400 porque el único origen posible
 * es el request.
 */
function toUploadError(err: unknown): HttpError {
  if (err instanceof MulterError && err.code === 'LIMIT_FILE_SIZE') {
    return new HttpError(413, `La foto no puede pesar más de ${AVATAR_MAX_BYTES / BYTES_PER_MB} MB`);
  }
  if (err instanceof MulterError && err.code === 'LIMIT_UNEXPECTED_FILE') {
    return new HttpError(400, `Enviá la foto en el campo "${AVATAR_FIELD}"`);
  }
  return new HttpError(400, 'No se pudo leer la foto enviada');
}

/**
 * Lee el multipart de la foto en memoria (campo `avatar`, un solo archivo, sin campos de texto) y la deja en
 * `req.file`. Corta el upload al pasar `AVATAR_MAX_BYTES`, así que nunca se bufferea más que eso. Va después de
 * `authenticateJwt` y del rate limiter para no leer el cuerpo de quien no puede subir. No mira el tipo declarado:
 * el formato lo decide `detectAvatarImage` por los bytes.
 */
export function uploadAvatarFile(req: Request, res: Response, next: NextFunction): void {
  parseAvatar(req, res, err => next(err ? toUploadError(err) : undefined));
}
