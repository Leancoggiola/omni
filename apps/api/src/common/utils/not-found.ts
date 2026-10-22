import type { NextFunction, Request, Response } from 'express';

import { HttpError } from '../http';

/**
 * Sin esto, una ruta inexistente bajo `/api` cae en el 404 por defecto de Express, que responde HTML.
 * Delegar en `errorHandler` mantiene el mismo formato `{ statusCode, message }` que el resto de los errores.
 */
export function apiNotFound(_req: Request, _res: Response, next: NextFunction) {
  next(new HttpError(404, 'Ruta no encontrada'));
}
