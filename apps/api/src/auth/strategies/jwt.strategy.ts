import passport from 'passport';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import { Request } from 'express';
import { config, JWT_ALGORITHM } from '../../config';

interface JwtPayload {
  sub: string;
  username: string;
  role: string;
}

passport.use(
  'jwt',
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req: Request) => req?.cookies?.access_token ?? null,
      ]),
      algorithms: [JWT_ALGORITHM],
      ignoreExpiration: false,
      secretOrKey: config.jwt.accessSecret,
    },
    (payload: JwtPayload, done) => {
      return done(null, {
        userId: payload.sub,
        username: payload.username,
        role: payload.role,
      });
    }
  )
);
