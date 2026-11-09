import pinoHttp from 'pino-http';
import type { Logger } from 'pino';

import { ORIGIN_SECRET_HEADER } from './origin-guard';

/** Headers que llevan credenciales: el serializer de pino-http los incluye completos si no se redactan. */
const REDACTED_HTTP_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  `req.headers["${ORIGIN_SECRET_HEADER}"]`,
  'res.headers["set-cookie"]',
];

/** Logger de requests: cada línea pasa por `redact` antes de salir, así ningún token llega a los logs. */
export function createHttpLogger(logger: Logger) {
  return pinoHttp({ logger, redact: REDACTED_HTTP_PATHS });
}
