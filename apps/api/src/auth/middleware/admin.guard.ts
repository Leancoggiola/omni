import type { Request, Response, NextFunction } from 'express';
import { HttpError } from '../../common/http';

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (req.user?.role !== 'ADMIN') {
    next(new HttpError(403, 'Acceso denegado: se requiere rol ADMIN'));
    return;
  }

  next();
}
