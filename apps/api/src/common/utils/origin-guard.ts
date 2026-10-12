import { createHash, timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, RequestHandler, Response } from 'express';

import { config } from '../../config';

export const ORIGIN_SECRET_HEADER = 'x-origin-secret';

/**
 * Compara los hashes y no los valores: `timingSafeEqual` tira con buffers de distinto largo,
 * y cortar antes por largo filtraría el largo del secreto por tiempo de respuesta.
 */
function safeEqual(received: string, expected: string): boolean {
  const a = createHash('sha256').update(received).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}

/**
 * La API solo se expone a través del proxy de Vercel, que agrega `x-origin-secret`. Sin secreto
 * configurado (dev, tests, E2E) el guard no actúa. Marca `res.locals.viaProxy` para que el rate
 * limit confíe en `x-real-ip`: solo un request que pasó por el proxy puede traer ese header legítimo.
 */
export function createOriginGuard(secret: string | undefined): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!secret) return next();

    const received = req.get(ORIGIN_SECRET_HEADER);
    if (!received || !safeEqual(received, secret)) {
      res.status(403).json({ statusCode: 403, message: 'Acceso no permitido' });
      return;
    }

    res.locals.viaProxy = true;
    next();
  };
}

export const originGuard = createOriginGuard(config.originSecret);
