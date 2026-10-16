import type { Request, Response, NextFunction } from 'express';

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  const user = req.user as { userId: string; username: string; role: string } | undefined;

  if (!user || user.role !== 'ADMIN') {
    next({ status: 403, message: 'Acceso denegado: se requiere rol ADMIN' });
    return;
  }

  next();
}
