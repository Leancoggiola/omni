import jwt from 'jsonwebtoken';

import { config } from '../../config';

export interface TestJwtUser {
  userId: string;
  username: string;
  role: string;
}

/** Firma un token que acepta la estrategia jwt real — en integración no se mockea ningún middleware. */
export function signAccessToken(user: TestJwtUser): string {
  return jwt.sign({ sub: user.userId, username: user.username, role: user.role }, config.jwt.accessSecret, {
    expiresIn: '15m',
  });
}

export function authHeader(user: TestJwtUser): string {
  return `Bearer ${signAccessToken(user)}`;
}
