import type { Request, Response } from 'express';
import { ipKeyGenerator } from 'express-rate-limit';

/**
 * Detrás del proxy de Vercel, `req.ip` es la IP de Vercel y todos los usuarios compartirían el límite:
 * la IP real llega en `x-real-ip`. Ese header solo se respeta si el request pasó el origin guard
 * (`res.locals.viaProxy`); si no, cualquiera podría inventarlo para esquivar el rate limit.
 */
export function getClientIp(req: Request, res: Response): string {
  const realIp = res.locals.viaProxy ? req.get('x-real-ip')?.trim() : undefined;
  return realIp || req.ip || req.socket.remoteAddress || 'unknown';
}

/** `ipKeyGenerator` agrupa IPv6 por subred: si no, un cliente IPv6 rota direcciones y evade el límite. */
export function clientIpKey(req: Request, res: Response): string {
  return ipKeyGenerator(getClientIp(req, res));
}
