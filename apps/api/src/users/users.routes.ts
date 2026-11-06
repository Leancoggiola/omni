import { Router } from 'express';
import { AVATAR_FIELD, updateProfileSchema, changePasswordSchema, updatePreferencesSchema } from '@omni/shared/users';
import { authenticateJwt } from '../auth/middleware/auth.middleware';
import { HttpError } from '../common/http';
import { clearCookies, createRateLimiter, validate } from '../common/utils';
import { uploadAvatarFile } from './avatar-upload';
import * as avatarService from './avatar.service';
import * as usersService from './users.service';

const passwordLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    statusCode: 429,
    message: 'Demasiados intentos de cambio de contraseña, intenta de nuevo más tarde',
  },
});

const avatarLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    statusCode: 429,
    message: 'Demasiados cambios de foto de perfil, intenta de nuevo más tarde',
  },
});

const router = Router();

router.get('/profile', authenticateJwt, async (req, res) => {
  const { userId } = req.user!;
  const profile = await usersService.getProfile(userId);
  res.json({ user: profile });
});

router.patch('/profile', authenticateJwt, validate(updateProfileSchema), async (req, res) => {
  const { userId } = req.user!;
  const user = await usersService.updateProfile(userId, req.body);
  res.json({ user });
});

router.patch('/password', authenticateJwt, passwordLimiter, validate(changePasswordSchema), async (req, res) => {
  const { userId } = req.user!;
  await usersService.changePassword(userId, req.body);
  res.json({ message: 'Contraseña actualizada exitosamente' });
});

router.put('/avatar', authenticateJwt, avatarLimiter, uploadAvatarFile, async (req, res) => {
  if (!req.file) throw new HttpError(400, `Falta la foto: enviala como multipart en el campo "${AVATAR_FIELD}"`);
  const { userId } = req.user!;
  const user = await avatarService.replaceAvatar(userId, req.file.buffer);
  res.json({ user });
});

router.delete('/avatar', authenticateJwt, avatarLimiter, async (req, res) => {
  const { userId } = req.user!;
  const user = await avatarService.removeAvatar(userId);
  res.json({ user });
});

router.delete('/account', authenticateJwt, async (req, res) => {
  const { userId } = req.user!;
  await usersService.deleteAccount(userId);
  clearCookies(res);
  res.json({ message: 'Cuenta eliminada exitosamente' });
});

router.patch('/preferences', authenticateJwt, validate(updatePreferencesSchema), async (req, res) => {
  const { userId } = req.user!;
  const preferences = await usersService.updatePreferences(userId, req.body);
  res.json({ preferences });
});

export default router;
