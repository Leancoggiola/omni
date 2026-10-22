import type { Request } from 'express';

/**
 * Devuelve `req.query` ya parseado por `validate(schema, 'query')`. Express lo tipa como `ParsedQs`, pero tras la
 * validación tiene la forma del schema: el cast vive acá y no en cada ruta.
 */
export function validatedQuery<T>(req: Request): T {
  return req.query as unknown as T;
}
