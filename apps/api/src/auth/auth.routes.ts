import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import * as authService from './auth.service';
import { createRateLimiter, validate } from '../common/utils';
import { loginSchema, refreshTokenBodySchema } from '@omni/shared/auth';
import { REFRESH_COOKIE } from '../common/utils/cookies';
import { authenticateLocal, authenticateJwt, authenticateJwtRefresh } from './middleware/auth.middleware';

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

/** Propio y no el de refresh: la misma instancia comparte el contador entre rutas. */
const logoutLimiter = createRateLimiter({
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
 * Sin `authenticateJwt`: el logout se identifica con el refresh token (body de mobile o cookie de la web) y el
 * header `Authorization` se ignora, así funciona con el access token vencido. Sin `validate`: un body inválido no
 * da 400, se ignora y se usa la cookie, para que el logout siempre borre las cookies.
 */
router.post('/logout', logoutLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = refreshTokenBodySchema.safeParse(req.body);
    const fromCookie = req.cookies?.[REFRESH_COOKIE];
    const refreshToken =
      (body.success ? body.data.refreshToken : undefined) ?? (typeof fromCookie === 'string' ? fromCookie : undefined);
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
