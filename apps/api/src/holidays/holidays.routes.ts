import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';

import { authenticateJwt } from '../auth/middleware/auth.middleware';
import { createRateLimiter } from '../common/utils';
import * as holidaysService from './holidays.service';

// El caché diario ya protege a Wikipedia; este límite protege a la API.
const holidaysLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: {
    statusCode: 429,
    message: 'Demasiadas consultas, intenta de nuevo más tarde',
  },
});

const router = Router();

router.use(authenticateJwt);

router.get('/today', holidaysLimiter, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await holidaysService.getTodayHolidays());
  } catch (err) {
    next(err);
  }
});

export default router;
