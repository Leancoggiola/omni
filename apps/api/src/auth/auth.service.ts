import jwt from 'jsonwebtoken';
import * as bcrypt from 'bcrypt';
import { Response } from 'express';

import { config } from '../config';
import * as usersService from '../users/users.service';
import { prisma } from '../common/db';
import type { AuthTokensResponse, Role } from '@omni/shared/auth';
import { toSessionUser } from './auth.mappers';

const BCRYPT_ROUNDS = 12;

// ─── Validate (for LocalStrategy) ──────────────────────────

export async function validateUser(username: string, password: string) {
  const user = await usersService.findByUsername(username);
  if (!user) return null;

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return null;

  return sanitizeUser(user);
}

// ─── Login ─────────────────────────────────────────────────

export async function login(
  user: {
    id: string;
    username: string;
    name: string;
    email: string | null;
    role: Role;
    avatarUrl: string | null;
  },
  res: Response
): Promise<AuthTokensResponse> {
  const tokens = await issueTokens({ sub: user.id, username: user.username, role: user.role }, res);

  const fullUser = await usersService.findById(user.id);
  if (!fullUser) {
    throw { status: 401, message: 'Usuario no encontrado' };
  }

  return { user: toSessionUser(fullUser), ...tokens };
}

// ─── Refresh ───────────────────────────────────────────────

export async function refresh(userId: string, rawRefreshToken: string, res: Response): Promise<AuthTokensResponse> {
  // Clean up expired tokens for this user
  await prisma.refreshToken.deleteMany({
    where: { userId, expiresAt: { lt: new Date() } },
  });

  const storedTokens = await prisma.refreshToken.findMany({
    where: { userId },
  });

  let matchedToken: (typeof storedTokens)[number] | null = null;
  for (const token of storedTokens) {
    const isMatch = await bcrypt.compare(rawRefreshToken, token.tokenHash);
    if (isMatch) {
      matchedToken = token;
      break;
    }
  }

  if (!matchedToken) {
    await prisma.refreshToken.deleteMany({ where: { userId } });
    clearCookies(res);
    throw {
      status: 401,
      message: 'Token de refresco no reconocido. Todas las sesiones han sido revocadas.',
    };
  }

  await prisma.refreshToken.delete({ where: { id: matchedToken.id } });

  const user = await usersService.findById(userId);
  if (!user) {
    throw { status: 401, message: 'Usuario no encontrado' };
  }

  const tokens = await issueTokens({ sub: userId, username: user.username, role: user.role }, res);

  return { user: toSessionUser(user), ...tokens };
}

// ─── Logout ────────────────────────────────────────────────

export async function logout(userId: string, rawRefreshToken: string | undefined, res: Response) {
  if (rawRefreshToken) {
    const storedTokens = await prisma.refreshToken.findMany({
      where: { userId },
    });

    for (const token of storedTokens) {
      const isMatch = await bcrypt.compare(rawRefreshToken, token.tokenHash);
      if (isMatch) {
        await prisma.refreshToken.delete({ where: { id: token.id } });
        break;
      }
    }
  } else {
    await prisma.refreshToken.deleteMany({ where: { userId } });
  }

  clearCookies(res);

  return { message: 'Sesión cerrada exitosamente' };
}

// ─── Profile ───────────────────────────────────────────────

export async function getProfile(userId: string) {
  const user = await usersService.findById(userId);
  if (!user) {
    throw { status: 401, message: 'Usuario no encontrado' };
  }
  return { user: toSessionUser(user) };
}

// ─── Private helpers ──────────────────────────────────────

async function issueTokens(
  payload: { sub: string; username: string; role: string },
  res: Response
): Promise<{ accessToken: string; refreshToken: string }> {
  const accessToken = jwt.sign(payload, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpiresIn as string & jwt.SignOptions['expiresIn'],
  });
  const refreshToken = jwt.sign({ sub: payload.sub }, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn as string & jwt.SignOptions['expiresIn'],
  });

  const tokenHash = await bcrypt.hash(refreshToken, BCRYPT_ROUNDS);
  const expiresAt = new Date(Date.now() + config.cookie.refreshMaxAge);

  await prisma.refreshToken.create({
    data: { userId: payload.sub, tokenHash, expiresAt },
  });

  setAccessCookie(res, accessToken);
  setRefreshCookie(res, refreshToken);

  return { accessToken, refreshToken };
}

function setAccessCookie(res: Response, token: string) {
  res.cookie('access_token', token, {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: 'strict',
    path: '/api',
    maxAge: 15 * 60 * 1000,
  });
}

function setRefreshCookie(res: Response, token: string) {
  res.cookie('refresh_token', token, {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: 'strict',
    path: '/api/auth/refresh',
    maxAge: config.cookie.refreshMaxAge,
  });
}

function clearCookies(res: Response) {
  res.clearCookie('access_token', {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: 'strict',
    path: '/api',
  });
  res.clearCookie('refresh_token', {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: 'strict',
    path: '/api/auth/refresh',
  });
}

function sanitizeUser(user: any) {
  const { password: _password, ...rest } = user;
  return rest;
}
