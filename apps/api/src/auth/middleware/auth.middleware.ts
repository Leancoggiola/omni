import type { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { HttpError } from '../../common/http';
import { logRefreshRejection, refreshTokenOwner } from '../auth.service';
import type { LoginUser } from '../auth.service';
import { extractRefreshToken } from '../strategies/jwt-refresh.strategy';

type AuthInfo = { name?: string; message?: string } | undefined;

function authenticate(strategy: string, onReject?: (req: Request, info: AuthInfo) => void) {
  return (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate(
      strategy,
      { session: false },
      (err: Error | null, user: Express.User | false, info: AuthInfo) => {
        if (err) return next(err);
        if (!user) {
          onReject?.(req, info);
          return next(new HttpError(401, info?.message ?? 'No autorizado'));
        }
        req.user = user;
        next();
      }
    )(req, res, next);
  };
}

/**
 * Loguea por qué la estrategia `jwt-refresh` rechazó el token. Solo del vencido se busca el usuario, verificando la
 * firma sin mirar el vencimiento: de uno sin firma válida no se puede confiar ni en el `sub`.
 */
function logRejectedRefreshToken(req: Request, info: AuthInfo) {
  const raw = extractRefreshToken(req);
  if (!raw) return logRefreshRejection('missing');
  if (info?.name === 'TokenExpiredError') return logRefreshRejection('expired', { userId: refreshTokenOwner(raw) });
  logRefreshRejection('invalid');
}

export const authenticateLocal = authenticate('local');
export const authenticateJwt = authenticate('jwt');
export const authenticateJwtRefresh = authenticate('jwt-refresh', logRejectedRefreshToken);
export const authenticateLogout = authenticate('logout');

/** Usuario completo que deja la estrategia `local`: no es la identidad del access token que tipa `Express.User`. */
export function getLoginUser(req: Request): LoginUser {
  return req.user as unknown as LoginUser;
}

/** Datos que deja la estrategia `jwt-refresh`: el usuario del token y el token crudo. */
export function getRefreshSession(req: Request): { userId: string; refreshToken: string } {
  return req.user as unknown as { userId: string; refreshToken: string };
}

/** Refresh token que extrae la estrategia `logout`; puede faltar. */
export function getLogoutToken(req: Request): string | undefined {
  return (req.user as unknown as { refreshToken: string | undefined }).refreshToken;
}
