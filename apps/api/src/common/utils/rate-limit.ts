import rateLimit, { type Options } from 'express-rate-limit';

import { config } from '../../config';
import { clientIpKey } from './client-ip';

/**
 * Los límites son por IP, así que una suite E2E entera se ve como un solo cliente y los agota.
 * `RATE_LIMIT_DISABLED` deja apagarlos en ese entorno; en producción quedan siempre activos.
 * La clave sale de `clientIpKey`, que confía en `x-real-ip` solo si el origin guard ya corrió.
 */
export function createRateLimiter(options: Partial<Options>) {
  return rateLimit({ keyGenerator: clientIpKey, ...options, skip: () => config.rateLimit.disabled });
}
