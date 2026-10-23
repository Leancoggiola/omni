import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import passport from 'passport';

import { config } from './config';
import './auth/strategies/jwt.strategy';
import './auth/strategies/jwt-refresh.strategy';
import './auth/strategies/logout.strategy';
import './auth/strategies/local.strategy';

import router from './router';
import healthRoutes from './health/health.routes';
import {
  apiNotFound,
  createHttpLogger,
  createRateLimiter,
  errorHandler,
  logger,
  noStore,
  originGuard,
} from './common/utils';

/**
 * Arma la app Express completa, sin `listen` ni `$connect`: la usan `main.ts` y los tests de integración, así el orden
 * de los middlewares es el mismo en producción y bajo test.
 * `trust proxy = 1` porque Render pone un balanceador delante: `req.ip` sale de su `X-Forwarded-For`.
 * El orden en `/api` importa: health queda exento del guard (Render pega directo), y el guard corre antes que
 * cualquier rate limiter para que la clave por IP ya sepa si puede confiar en `x-real-ip`.
 * `apiNotFound` cierra `/api` para que ninguna respuesta de la API salga en HTML.
 */
export function createApp() {
  const app = express();

  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(
    cors({
      origin: config.corsOrigin,
      credentials: true,
    })
  );

  app.use('/api', noStore);
  app.use('/api/health', healthRoutes);
  app.use('/api', originGuard);

  app.use(
    createRateLimiter({
      windowMs: 15 * 60 * 1000,
      max: config.rateLimit.globalMax,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        statusCode: 429,
        message: 'Demasiadas solicitudes, intenta de nuevo más tarde',
      },
    })
  );

  app.use(express.json());
  app.use(cookieParser());
  app.use(passport.initialize());
  app.use(createHttpLogger(logger));

  app.use('/api', router);
  app.use('/api', apiNotFound);

  app.use(errorHandler);

  return app;
}
