import type { NextFunction, Request, Response } from 'express';

/** El CDN de Vercel queda delante de `/api`: ninguna respuesta con datos de usuario puede quedar cacheada ahí. */
export function noStore(_req: Request, res: Response, next: NextFunction) {
  res.set('Cache-Control', 'no-store');
  next();
}
