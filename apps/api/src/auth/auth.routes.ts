import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import * as authService from './auth.service';
import { createRateLimiter, validate } from '../common/utils';
import { loginSchema, refreshTokenBodySchema } from '@omni/shared/auth';
import {
  authenticateLocal,
  authenticateJwt,
  authenticateJwtRefresh,
  authenticateLogout,
} from './middleware/auth.middleware';

const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    statusCode: 429,
    message: 'Demasiados intentos, intenta de nuevo más tarde',
  },
});

const refreshLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    statusCode: 429,
    message: 'Demasiados intentos, intenta de nuevo más tarde',
  },
});

const router = Router();

router.post(
  '/login',
  authLimiter,
  validate(loginSchema),
  authenticateLocal,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await authService.login(req.user as authService.LoginUser, res);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/refresh',
  refreshLimiter,
  validate(refreshTokenBodySchema),
  authenticateJwtRefresh,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, refreshToken } = req.user as { userId: string; refreshToken: string };
      const result = await authService.refresh(userId, refreshToken, res);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * Sin `authenticateJwt` ni limiter propio: el logout se identifica con el refresh token que extrae la estrategia
 * `logout` (body de mobile o cookie de la web), así funciona con el access token vencido y siempre borra las cookies.
 * Un limiter propio respondería 429 sin borrarlas; queda el global.
 */
router.post('/logout', authenticateLogout, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.user as { refreshToken: string | undefined };
    const result = await authService.logout(refreshToken, res);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/profile', authenticateJwt, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.user as { userId: string };
    const result = await authService.getProfile(userId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
