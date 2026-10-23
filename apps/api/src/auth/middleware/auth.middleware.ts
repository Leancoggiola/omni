import type { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { HttpError } from '../../common/http';
import type { LoginUser } from '../auth.service';

function authenticate(strategy: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate(
      strategy,
      { session: false },
      (err: Error | null, user: Express.User | false, info: { message?: string }) => {
        if (err) return next(err);
        if (!user) {
          return next(new HttpError(401, info?.message ?? 'No autorizado'));
        }
        req.user = user;
        next();
      }
    )(req, res, next);
  };
}

export const authenticateLocal = authenticate('local');
export const authenticateJwt = authenticate('jwt');
export const authenticateJwtRefresh = authenticate('jwt-refresh');
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
