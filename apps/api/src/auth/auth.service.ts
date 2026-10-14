import { createHash, randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import * as bcrypt from 'bcrypt';
import { Response } from 'express';

import { config } from '../config';
import * as usersService from '../users/users.service';
import { prisma } from '../common/db';
import type { PrismaTransactionClient } from '../common/db/prisma';
import { clearCookies, setAccessCookie, setRefreshCookie } from '../common/utils/cookies';
import type { AuthTokensResponse, Role } from '@omni/shared/auth';
import { toSessionUser } from './auth.mappers';
import { lockUserSessions } from './session-lock';

/** Al pasar este tope, cada sesión nueva borra las más viejas del usuario. */
export const MAX_SESSIONS_PER_USER = 10;

/**
 * Tiempo durante el que un refresh token recién rotado se sigue aceptando mientras su sucesor no se haya usado:
 * cubre dos pestañas refrescando a la vez y una respuesta de rotación que no llegó al cliente.
 */
export const ROTATION_GRACE_MS = 30 * 1000;

/** Trae las preferencias junto con el usuario: login arma la sesión sin volver a la base. */
export async function validateUser(username: string, password: string) {
  const user = await usersService.findByUsernameForLogin(username);
  if (!user) return null;

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return null;

  return sanitizeUser(user);
}

export type LoginUser = Parameters<typeof toSessionUser>[0] & { id: string; role: Role };

/** Cada refresh token lleva un `jti` aleatorio, así que su sha256 identifica una sola sesión. */
export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** El usuario ya llega completo desde validateUser: los tokens se emiten recién con la sesión armada. */
export async function login(user: LoginUser, res: Response): Promise<AuthTokensResponse> {
  const tokens = signTokens({ sub: user.id, username: user.username, role: user.role });

  await prisma.$transaction(async tx => {
    await lockUserSessions(tx, user.id);
    await tx.refreshToken.deleteMany({ where: { userId: user.id, expiresAt: { lt: new Date() } } });
    await storeRefreshToken(tx, user.id, tokens, null);
    await enforceSessionCap(tx, user.id);
  });

  return { user: toSessionUser(user), ...sendTokens(res, tokens) };
}

type RotationOutcome = 'rotated' | 'grace' | 'unknown' | 'reused';

/**
 * Rota el refresh token: lo marca con `rotatedAt` (atómico, solo uno de dos refresh simultáneos lo logra) y emite el
 * sucesor. La fila rotada queda hasta que vence para reconocer un reuso:
 * - token ya rotado cuyo sucesor sigue sin usarse y tiene menos de `ROTATION_GRACE_MS`: recibe una sesión hermana.
 *   La hermana no hereda el linaje, así la ventana no se renueva;
 * - token ya rotado fuera de esa ventana: es un reuso y se revocan todas las sesiones del usuario;
 * - token que no está en la base (cerrado, expulsado por el tope, revocado): 401 sin tocar las otras sesiones.
 */
export async function refresh(userId: string, rawRefreshToken: string, res: Response): Promise<AuthTokensResponse> {
  const user = await usersService.findById(userId);
  if (!user) {
    throw { status: 401, message: 'Usuario no encontrado' };
  }

  const tokenHash = hashRefreshToken(rawRefreshToken);
  const tokens = signTokens({ sub: userId, username: user.username, role: user.role });

  const outcome = await prisma.$transaction(async (tx): Promise<RotationOutcome> => {
    await lockUserSessions(tx, userId);
    const now = new Date();
    await tx.refreshToken.deleteMany({ where: { userId, expiresAt: { lt: now } } });

    const { count } = await tx.refreshToken.updateMany({
      where: { tokenHash, userId, rotatedAt: null },
      data: { rotatedAt: now },
    });
    if (count === 1) {
      await storeRefreshToken(tx, userId, tokens, tokenHash);
      return 'rotated';
    }

    const stored = await tx.refreshToken.findFirst({ where: { tokenHash, userId }, select: { id: true } });
    if (!stored) return 'unknown';

    const successor = await tx.refreshToken.findFirst({
      where: {
        userId,
        previousTokenHash: tokenHash,
        rotatedAt: null,
        createdAt: { gte: new Date(now.getTime() - ROTATION_GRACE_MS) },
      },
      select: { id: true },
    });
    if (successor) {
      await storeRefreshToken(tx, userId, tokens, null);
      await enforceSessionCap(tx, userId);
      return 'grace';
    }

    await tx.refreshToken.deleteMany({ where: { userId } });
    return 'reused';
  });

  if (outcome === 'unknown') {
    clearCookies(res);
    throw { status: 401, message: 'La sesión ya no es válida' };
  }
  if (outcome === 'reused') {
    clearCookies(res);
    throw {
      status: 401,
      message: 'Token de refresco no reconocido. Todas las sesiones han sido revocadas.',
    };
  }

  return { user: toSessionUser(user), ...sendTokens(res, tokens) };
}

/**
 * Se identifica con el refresh token y no con el access token, para que funcione aunque este haya vencido: la firma
 * se verifica sin mirar el vencimiento solo para saber de qué usuario es. Borra la fila del token y la de su sucesor
 * sin usar, por si la respuesta de la última rotación no llegó al cliente; sin la fila, un refresh posterior con ese
 * token da 401 sin revocar las otras sesiones. Las cookies se borran antes de tocar la base y la respuesta es siempre
 * la misma: sin token, con uno inválido o ya revocado, o con dos logouts simultáneos.
 */
export async function logout(rawRefreshToken: string | undefined, res: Response) {
  clearCookies(res);

  const userId = rawRefreshToken ? refreshTokenOwner(rawRefreshToken) : null;
  if (rawRefreshToken && userId) {
    const tokenHash = hashRefreshToken(rawRefreshToken);
    await prisma.$transaction(async tx => {
      await lockUserSessions(tx, userId);
      await tx.refreshToken.deleteMany({
        where: { userId, OR: [{ tokenHash }, { previousTokenHash: tokenHash, rotatedAt: null }] },
      });
    });
  }

  return { message: 'Sesión cerrada exitosamente' };
}

export async function getProfile(userId: string) {
  const user = await usersService.findById(userId);
  if (!user) {
    throw { status: 401, message: 'Usuario no encontrado' };
  }
  return { user: toSessionUser(user) };
}

function refreshTokenOwner(rawRefreshToken: string): string | null {
  try {
    const payload = jwt.verify(rawRefreshToken, config.jwt.refreshSecret, { ignoreExpiration: true });
    return typeof payload === 'object' && typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}

interface SignedTokens {
  accessToken: string;
  refreshToken: string;
  tokenHash: string;
  expiresAt: Date;
}

/** `expiresAt` sale del `exp` del propio JWT: la fila y el token vencen juntos. */
function signTokens(payload: { sub: string; username: string; role: string }): SignedTokens {
  const accessToken = jwt.sign(payload, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpiresIn as string & jwt.SignOptions['expiresIn'],
  });
  const refreshToken = jwt.sign({ sub: payload.sub }, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn as string & jwt.SignOptions['expiresIn'],
    jwtid: randomUUID(),
  });
  const { exp } = jwt.decode(refreshToken) as jwt.JwtPayload & { exp: number };

  return { accessToken, refreshToken, tokenHash: hashRefreshToken(refreshToken), expiresAt: new Date(exp * 1000) };
}

/**
 * `createdAt` se fija desde la app y no con el `now()` de Postgres, que dentro de una transacción vale lo mismo
 * para todas las filas: la ventana de gracia y el orden del tope de sesiones dependen de él.
 */
async function storeRefreshToken(
  tx: PrismaTransactionClient,
  userId: string,
  { tokenHash, expiresAt }: SignedTokens,
  previousTokenHash: string | null
) {
  await tx.refreshToken.create({
    data: { userId, tokenHash, previousTokenHash, expiresAt, createdAt: new Date() },
  });
}

/**
 * Solo login y la gracia suman sesiones: la rotación reemplaza una sesión por otra y no necesita el tope. Cuenta
 * solo las sesiones vigentes: las filas rotadas quedan para detectar reusos y `login` y `refresh` las podan al vencer.
 */
async function enforceSessionCap(tx: PrismaTransactionClient, userId: string) {
  const overflow = await tx.refreshToken.findMany({
    where: { userId, rotatedAt: null },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    skip: MAX_SESSIONS_PER_USER,
    select: { id: true },
  });
  if (overflow.length > 0) {
    await tx.refreshToken.deleteMany({ where: { id: { in: overflow.map(({ id }) => id) } } });
  }
}

function sendTokens(res: Response, { accessToken, refreshToken }: SignedTokens) {
  setAccessCookie(res, accessToken);
  setRefreshCookie(res, refreshToken);
  return { accessToken, refreshToken };
}

function sanitizeUser<T extends { password: string }>(user: T): Omit<T, 'password'> {
  const { password: _password, ...rest } = user;
  return rest;
}
