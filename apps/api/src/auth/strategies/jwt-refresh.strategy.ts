import passport from 'passport';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import { Request } from 'express';
import { config, JWT_ALGORITHM } from '../../config';

/** Refresh token del request: Bearer, cookie o body, en ese orden. */
export function extractRefreshToken(req: Request): string | null {
  const fromHeader = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
  if (fromHeader) return fromHeader;

  const fromCookie = req?.cookies?.refresh_token;
  if (typeof fromCookie === 'string' && fromCookie.length > 0) return fromCookie;

  const fromBody = req?.body?.refreshToken;
  if (typeof fromBody === 'string' && fromBody.length > 0) return fromBody;

  return null;
}

passport.use(
  'jwt-refresh',
  new JwtStrategy(
    {
      jwtFromRequest: extractRefreshToken,
      algorithms: [JWT_ALGORITHM],
      ignoreExpiration: false,
      secretOrKey: config.jwt.refreshSecret,
      passReqToCallback: true,
    },
    (req: Request, payload: { sub: string }, done) => {
      const refreshToken = extractRefreshToken(req);
      return done(null, { userId: payload.sub, refreshToken });
    }
  )
);
