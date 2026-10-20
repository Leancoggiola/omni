import passport, { Strategy } from 'passport';
import type { Request } from 'express';

import { refreshTokenBodySchema } from '@omni/shared/auth';
import { REFRESH_COOKIE } from '../../common/utils/cookies';

/**
 * Lee el refresh token que el logout tiene que revocar: el del body (mobile) y, si no viene o es inválido, el de la
 * cookie (web). Nunca rechaza: el logout responde igual sin token, y el service decide si el token es válido.
 * El header `Authorization` se ignora, así un access token vencido no interfiere.
 */
function extractLogoutRefreshToken(req: Request): string | undefined {
  const body = refreshTokenBodySchema.safeParse(req.body);
  if (body.success && body.data.refreshToken) return body.data.refreshToken;

  const fromCookie = req.cookies?.[REFRESH_COOKIE];
  return typeof fromCookie === 'string' && fromCookie.length > 0 ? fromCookie : undefined;
}

class LogoutStrategy extends Strategy {
  override name = 'logout';

  override authenticate(req: Request) {
    this.success({ refreshToken: extractLogoutRefreshToken(req) });
  }
}

passport.use(new LogoutStrategy());
