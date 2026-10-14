import type { Request, Response, NextFunction } from 'express';
import passport from 'passport';

function authenticate(strategy: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate(
      strategy,
      { session: false },
      (err: Error | null, user: Express.User | false, info: { message?: string }) => {
        if (err) return next(err);
        if (!user) {
          return next({
            status: 401,
            message: info?.message ?? 'No autorizado',
          });
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
