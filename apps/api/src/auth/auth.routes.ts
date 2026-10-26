import { Router, type Request } from 'express';
import * as authService from './auth.service';
import { createRateLimiter, validate } from '../common/utils';
import { CLIENT_HEADER, MOBILE_CLIENT, loginSchema, refreshTokenBodySchema } from '@omni/shared/auth';
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

const logoutAllLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    statusCode: 429,
    message: 'Demasiados intentos, intenta de nuevo más tarde',
  },
});

/**
 * La app mobile se identifica con `CLIENT_HEADER` en login y refresh. No alcanza con ver si el token llega en el body:
 * el `fetch` de React Native en Android guarda las cookies de la API y las manda de vuelta, igual que un navegador.
 * El header no se autentica a propósito: solo elige la vigencia, y quien lo manda ya presentó credenciales válidas
 * (password o refresh token). Con el refresh token alcanza para mantener una sesión de 7 días viva indefinidamente
 * refrescando antes de que venza, así que pedir 90 días no da acceso nuevo. La cookie sigue con la vigencia de la
 * web: la app mobile usa el token del body, y la cookie que guarda su `fetch` trae el mismo token.
 */
function sessionClient(req: Request): authService.SessionClient {
  return req.get(CLIENT_HEADER) === MOBILE_CLIENT ? 'mobile' : 'web';
}

const router = Router();

router.post('/login', authLimiter, validate(loginSchema), authenticateLocal, async (req, res) => {
  const result = await authService.login(getLoginUser(req), res, sessionClient(req));
  res.json(result);
});

router.post('/refresh', refreshLimiter, validate(refreshTokenBodySchema), authenticateJwtRefresh, async (req, res) => {
  const { userId, refreshToken } = getRefreshSession(req);
  const result = await authService.refresh(userId, refreshToken, res, sessionClient(req));
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

/** Revoca todas las sesiones del usuario: pide el access token, como cualquier acción sobre la cuenta. */
router.post('/logout-all', logoutAllLimiter, authenticateJwt, async (req, res) => {
  const result = await authService.logoutAll(req.user!.userId, res);
  res.json(result);
});

router.get('/profile', authenticateJwt, async (req, res) => {
  const { userId } = req.user!;
  const result = await authService.getProfile(userId);
  res.json(result);
});

export default router;
