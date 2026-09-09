import jwt from 'jsonwebtoken';

import { config } from '../../config';

export interface TestJwtUser {
  userId: string;
  username: string;
  role: string;
}

/** Signs a token the real jwt strategy accepts — no middleware is mocked in integration tests. */
export function signAccessToken(user: TestJwtUser): string {
  return jwt.sign({ sub: user.userId, username: user.username, role: user.role }, config.jwt.accessSecret, {
    expiresIn: '15m',
  });
}

export function authHeader(user: TestJwtUser): string {
  return `Bearer ${signAccessToken(user)}`;
}
