import { Router } from 'express';
import * as authService from './auth.service';
import { createRateLimiter, validate } from '../common/utils';
import { loginSchema, refreshTokenBodySchema } from '@omni/shared/auth';
import {
  authenticateLocal,
  authenticateJwt,
  authenticateJwtRefresh,
  authenticateLogout,
  getLoginUser,
  getRefreshSession,
  getLogoutToken,
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

router.post('/login', authLimiter, validate(loginSchema), authenticateLocal, async (req, res) => {
  const result = await authService.login(getLoginUser(req), res);
  res.json(result);
});

router.post('/refresh', refreshLimiter, validate(refreshTokenBodySchema), authenticateJwtRefresh, async (req, res) => {
  const { userId, refreshToken } = getRefreshSession(req);
  const result = await authService.refresh(userId, refreshToken, res);
  res.json(result);
});

/**
 * Sin `authenticateJwt` ni limiter propio: el logout se identifica con el refresh token que extrae la estrategia
 * `logout` (body de mobile o cookie de la web), así funciona con el access token vencido y siempre borra las cookies.
 * Un limiter propio respondería 429 sin borrarlas; queda el global.
 */
router.post('/logout', authenticateLogout, async (req, res) => {
  const result = await authService.logout(getLogoutToken(req), res);
  res.json(result);
});

router.get('/profile', authenticateJwt, async (req, res) => {
  const { userId } = req.user!;
  const result = await authService.getProfile(userId);
  res.json(result);
});

export default router;
