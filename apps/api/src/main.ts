import { config } from './config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import pinoHttp from 'pino-http';

import './auth/strategies/jwt.strategy';
import './auth/strategies/jwt-refresh.strategy';
import './auth/strategies/local.strategy';

import router from './router';
import healthRoutes from './health/health.routes';
import { createRateLimiter, errorHandler, logger, noStore, originGuard } from './common/utils';
import { checkDatabaseConnection, prisma } from './common/db';

/**
 * `trust proxy = 1` porque Render pone un balanceador delante: `req.ip` sale de su `X-Forwarded-For`.
 * El orden en `/api` importa: health queda exento del guard (Render pega directo), y el guard corre
 * antes que cualquier rate limiter para que la clave por IP ya sepa si puede confiar en `x-real-ip`.
 */
async function bootstrap() {
  await prisma.$connect();

  if (config.isProduction) {
    logger.info('Connected to PostgreSQL');
  } else {
    const dbOk = await checkDatabaseConnection();
    if (dbOk) {
      logger.info('PostgreSQL: conexión verificada');
    } else {
      logger.warn('La API arrancó sin conexión a la base de datos');
    }
  }

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
  app.use(pinoHttp({ logger }));

  app.use('/api', router);

  app.use(errorHandler);

  app.listen(config.port, '0.0.0.0', () => {
    logger.info(`API running on http://0.0.0.0:${config.port}`);
  });
}

bootstrap().catch(err => {
  logger.fatal(err, 'Failed to start');
  process.exit(1);
});
