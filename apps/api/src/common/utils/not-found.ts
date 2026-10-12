import type { NextFunction, Request, Response } from 'express';

import type { AppError } from './error-handler';

/**
 * Sin esto, una ruta inexistente bajo `/api` cae en el 404 por defecto de Express, que responde HTML.
 * Delegar en `errorHandler` mantiene el mismo formato `{ statusCode, message }` que el resto de los errores.
 */
export function apiNotFound(_req: Request, _res: Response, next: NextFunction) {
  const error: AppError = { status: 404, message: 'Ruta no encontrada' };
  next(error);
}
