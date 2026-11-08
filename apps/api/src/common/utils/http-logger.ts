import pinoHttp from 'pino-http';
import type { Logger } from 'pino';

import { API_PATHS } from '@omni/shared/api';

import { ORIGIN_SECRET_HEADER } from './origin-guard';

/** Headers que llevan credenciales: el serializer de pino-http los incluye completos si no se redactan. */
const REDACTED_HTTP_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  `req.headers["${ORIGIN_SECRET_HEADER}"]`,
  'res.headers["set-cookie"]',
];

interface SerializedRequest {
  url?: string;
  query?: unknown;
}

/** Las coordenadas del clima viajan en el query: se quitan del request serializado para que no queden en los logs. */
export function omitWeatherLocation<T extends SerializedRequest>(req: T): T {
  if (req.url?.startsWith(API_PATHS.weather.current)) {
    req.url = API_PATHS.weather.current;
    req.query = {};
  }
  return req;
}

/** Logger de requests: cada línea pasa por `redact` antes de salir, así ningún token llega a los logs. */
export function createHttpLogger(logger: Logger) {
  return pinoHttp({ logger, redact: REDACTED_HTTP_PATHS, serializers: { req: omitWeatherLocation } });
}
