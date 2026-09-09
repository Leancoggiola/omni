import express from 'express';
import cookieParser from 'cookie-parser';
import passport from 'passport';

import '../../auth/strategies/jwt.strategy';
import '../../auth/strategies/jwt-refresh.strategy';
import '../../auth/strategies/local.strategy';

import router from '../../router';
import { errorHandler } from '../../common/utils';

/**
 * Mirrors the middleware stack of main.ts, minus helmet, CORS, the rate limiter and
 * request logging — none of them affect behaviour under test and the limiter breaks it.
 * Passport runs for real here: auth is exercised, not mocked.
 */
export function createIntegrationApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use(passport.initialize());
  app.use('/api', router);
  app.use(errorHandler);
  return app;
}
