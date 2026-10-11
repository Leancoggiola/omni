import express from 'express';
import cookieParser from 'cookie-parser';
import passport from 'passport';

import '../../auth/strategies/jwt.strategy';
import '../../auth/strategies/jwt-refresh.strategy';
import '../../auth/strategies/local.strategy';

import router from '../../router';
import healthRoutes from '../../health/health.routes';
import { errorHandler, noStore, originGuard } from '../../common/utils';

/**
 * Replica el stack de middleware de main.ts, sin helmet, CORS, rate limiter ni logging:
 * ninguno afecta el comportamiento bajo test y el limiter directamente lo rompe.
 * Acá passport corre de verdad: la autenticación se ejercita, no se mockea.
 * El origin guard queda montado pero sin `ORIGIN_SECRET` no actúa; su lógica se cubre con tests unitarios.
 */
export function createIntegrationApp() {
  const app = express();
  app.use('/api', noStore);
  app.use('/api/health', healthRoutes);
  app.use('/api', originGuard);
  app.use(express.json());
  app.use(cookieParser());
  app.use(passport.initialize());
  app.use('/api', router);
  app.use(errorHandler);
  return app;
}
