import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import * as authService from '../auth.service';

passport.use(
  'local',
  new LocalStrategy({ usernameField: 'username' }, async (username, password, done) => {
    try {
      const user = await authService.validateUser(username, password);
      if (!user) return done(null, false, { message: 'Credenciales inválidas' });
      return done(null, user as unknown as Express.User);
    } catch (err) {
      return done(err);
    }
  })
);
