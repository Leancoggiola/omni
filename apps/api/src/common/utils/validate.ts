import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

type ValidationTarget = 'body' | 'query' | 'params';

function assignParsed(req: Request, target: ValidationTarget, parsed: unknown) {
  if (target === 'body') {
    req.body = parsed;
    return;
  }

  if (target === 'query') {
    Object.defineProperty(req, 'query', {
      value: parsed,
      writable: true,
      enumerable: true,
      configurable: true,
    });
    return;
  }

  const container = req[target] as Record<string, unknown>;
  for (const key of Object.keys(container)) {
    delete container[key];
  }
  Object.assign(container, parsed as Record<string, unknown>);
}

export function validate(schema: z.ZodType, target: ValidationTarget = 'body') {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      assignParsed(req, target, schema.parse(req[target]));
      next();
    } catch (err) {
      if (err instanceof z.ZodError) {
        next({
          status: 400,
          message: 'Error de validación',
          errors: z.flattenError(err).fieldErrors,
        });
      } else {
        next(err);
      }
    }
  };
}
