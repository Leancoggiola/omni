import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { updateProfileSchema, changePasswordSchema, updatePreferencesSchema } from '@omni/shared/users';
import { authenticateJwt } from '../auth/middleware/auth.middleware';
import { createRateLimiter, validate } from '../common/utils';
import * as usersService from './users.service';
import * as statsService from './stats.service';

const passwordLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    statusCode: 429,
    message: 'Demasiados intentos de cambio de contraseña, intenta de nuevo más tarde',
  },
});

const router = Router();

// ─── Profile ───────────────────────────────────────────────

router.get('/profile', authenticateJwt, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.user as any;
    const profile = await usersService.getProfile(userId);
    res.json({ user: profile });
  } catch (err) {
    next(err);
  }
});

router.patch(
  '/profile',
  authenticateJwt,
  validate(updateProfileSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.user as any;
      const user = await usersService.updateProfile(userId, req.body);
      res.json({ user });
    } catch (err) {
      next(err);
    }
  }
);

// ─── Password ──────────────────────────────────────────────

router.patch(
  '/password',
  authenticateJwt,
  passwordLimiter,
  validate(changePasswordSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.user as any;
      await usersService.changePassword(userId, req.body.newPassword);
      res.json({ message: 'Contraseña actualizada exitosamente' });
    } catch (err) {
      next(err);
    }
  }
);

// ─── Delete Account ────────────────────────────────────────

router.delete('/account', authenticateJwt, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.user as any;
    await usersService.deleteAccount(userId);
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');
    res.json({ message: 'Cuenta eliminada exitosamente' });
  } catch (err) {
    next(err);
  }
});

// ─── Preferences ───────────────────────────────────────────

router.patch(
  '/preferences',
  authenticateJwt,
  validate(updatePreferencesSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.user as any;
      const preferences = await usersService.updatePreferences(userId, req.body);
      res.json({ preferences });
    } catch (err) {
      next(err);
    }
  }
);

// ─── Stats ─────────────────────────────────────────────────

router.get('/stats', authenticateJwt, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.user as any;
    const stats = await statsService.getStats(userId);
    res.json({ stats });
  } catch (err) {
    next(err);
  }
});

export default router;
