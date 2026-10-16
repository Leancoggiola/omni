import type { Request, Response, NextFunction } from 'express';
import { config } from '../../config';
import { logger } from './logger';

export interface AppError {
  status?: number;
  message: string;
  errors?: Record<string, string[]>;
}

const PRISMA_ERRORS: Record<string, { status: number; message: string }> = {
  P2002: { status: 409, message: 'Ya existe un registro con esos datos' },
  P2025: { status: 404, message: 'Registro no encontrado' },
  P2003: { status: 400, message: 'Referencia inválida' },
  P2023: { status: 400, message: 'Dato inválido' },
};

/**
 * Traduce los errores conocidos de Prisma por su `code`, sin depender de la clase del cliente generado: un
 * check-then-create que pierde una carrera, un registro que desaparece entre dos queries o un id mal formado dejan
 * de ser un 500. Un error con `status` propio se respeta tal cual.
 */
function resolveError(err: AppError): AppError {
  if (err.status !== undefined) return err;

  const code = (err as { code?: unknown }).code;
  const mapped = typeof code === 'string' ? PRISMA_ERRORS[code] : undefined;
  return mapped ?? err;
}

export function errorHandler(rawErr: AppError, _req: Request, res: Response, _next: NextFunction) {
  const err = resolveError(rawErr);
  const status = err.status ?? 500;

  if (status === 500) {
    logger.error(rawErr, 'Unhandled error');
  }

  const message =
    status === 500 && config.isProduction
      ? 'Error interno del servidor'
      : (err.message ?? 'Error interno del servidor');

  res.status(status).json({
    statusCode: status,
    message,
    ...(err.errors && { errors: err.errors }),
  });
}
