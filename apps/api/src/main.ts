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
import { createRateLimiter, errorHandler, logger } from './common/utils';
import { checkDatabaseConnection, prisma } from './common/db';

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

  app.use(helmet());
  app.use(
    cors({
      origin: config.corsOrigin,
      credentials: true,
    })
  );

  // Global rate limiter: 100 requests per 15 minutes per IP
  app.use(
    createRateLimiter({
      windowMs: 15 * 60 * 1000,
      max: 100,
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

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

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
