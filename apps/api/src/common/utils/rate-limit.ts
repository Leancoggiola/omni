import rateLimit, { type Options } from 'express-rate-limit';

import { config } from '../../config';

/**
 * Los límites son por IP, así que una suite E2E entera se ve como un solo cliente y los agota.
 * `RATE_LIMIT_DISABLED` deja apagarlos en ese entorno; en producción quedan siempre activos.
 */
export function createRateLimiter(options: Partial<Options>) {
  return rateLimit({ ...options, skip: () => config.rateLimit.disabled });
}
