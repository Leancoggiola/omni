import { createHash, randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import * as bcrypt from 'bcrypt';
import { Response } from 'express';

import { config, JWT_ALGORITHM } from '../config';
import * as usersService from '../users/users.service';
import { lockUserSessions, prisma } from '../common/db';
import type { PrismaTransactionClient } from '../common/db/prisma';
import { clearCookies, setAccessCookie, setRefreshCookie } from '../common/utils/cookies';
import type { AuthTokensResponse, Role } from '@omni/shared/auth';
import { toSessionUser } from './auth.mappers';

/** Al pasar este tope, cada sesión nueva borra las más viejas del usuario. */
export const MAX_SESSIONS_PER_USER = 10;

/**
 * Tiempo, desde la rotación, durante el que un refresh token recién rotado se sigue aceptando mientras su sucesor no
 * se haya usado: cubre varias pestañas refrescando a la vez y una respuesta de rotación que no llegó al cliente.
 */
export const ROTATION_GRACE_MS = 30 * 1000;

/** Sesiones hermanas que puede recibir un token rotado dentro de la gracia, además de su sucesor. */
export const MAX_GRACE_SIBLINGS = 2;

/**
 * Hash bcrypt de costo 12 (el de los usuarios) contra el que se compara cuando el username no existe: así el login
 * tarda lo mismo exista o no la cuenta y no revela qué usernames están registrados. Es una constante para que
 * ningún login, ni el primero tras arrancar, pague un costo distinto.
 */
const DUMMY_PASSWORD_HASH = '$2b$12$E9mheTnBYQr8IG4ruH0QeOWAnRY2auJWScRrKAPCY/05r3snwbZJi';

/** Trae las preferencias junto con el usuario: login arma la sesión sin volver a la base. */
export async function validateUser(username: string, password: string) {
  const user = await usersService.findByUsernameForLogin(username);
  if (!user) {
    await bcrypt.compare(password, DUMMY_PASSWORD_HASH);
    return null;
  }

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

type RotationOutcome = { issued: SignedTokens } | { rejected: 'graceExhausted' | 'unknown' | 'reused' };

/**
 * Rota el refresh token: lo marca con `rotatedAt` (atómico, solo uno de dos refresh simultáneos lo logra) y emite el
 * sucesor. La fila rotada queda hasta que vence para reconocer un reuso:
 * - token rotado hace menos de `ROTATION_GRACE_MS` cuyo sucesor sigue sin usarse: recibe una sesión hermana, hasta
 *   `MAX_GRACE_SIBLINGS`. Después da 401 sin revocar nada ni borrar las cookies, que ya tienen el token nuevo;
 * - token rotado fuera de esa ventana, o con el sucesor ya usado: es un reuso y se revocan todas las sesiones;
 * - token rotado cuyo sucesor ya no está (expulsado por el tope o cerrado): 401 sin tocar las otras sesiones;
 * - token que no está en la base (cerrado, expulsado por el tope, revocado): 401 sin tocar las otras sesiones.
 * La ventana se mide desde la rotación, así ni las hermanas ni los reintentos la extienden, y las hermanas no pasan
 * por el tope de sesiones: no pueden expulsar a las del usuario. "Sucesor" es siempre el original (el más antiguo con
 * ese `previousTokenHash`): usar una hermana no cierra la gracia, que igual queda acotada por `MAX_GRACE_SIBLINGS`.
 * Los tokens se firman recién cuando se van a emitir.
 */
export async function refresh(userId: string, rawRefreshToken: string, res: Response): Promise<AuthTokensResponse> {
  const user = await usersService.findById(userId);
  if (!user) {
    throw { status: 401, message: 'Usuario no encontrado' };
  }

  const tokenHash = hashRefreshToken(rawRefreshToken);

  const outcome = await prisma.$transaction(async (tx): Promise<RotationOutcome> => {
    const issue = async () => {
      const tokens = signTokens({ sub: userId, username: user.username, role: user.role });
      await storeRefreshToken(tx, userId, tokens, tokenHash);
      return { issued: tokens };
    };

    await lockUserSessions(tx, userId);
    const now = new Date();
    await tx.refreshToken.deleteMany({ where: { userId, expiresAt: { lt: now } } });

    const { count } = await tx.refreshToken.updateMany({
      where: { tokenHash, userId, rotatedAt: null },
      data: { rotatedAt: now },
    });
    if (count === 1) return issue();

    const stored = await tx.refreshToken.findUnique({ where: { tokenHash, userId }, select: { rotatedAt: true } });
    if (!stored?.rotatedAt) return { rejected: 'unknown' };

    const [successor, ...siblings] = await tx.refreshToken.findMany({
      where: { userId, previousTokenHash: tokenHash },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: { rotatedAt: true },
    });
    if (!successor) return { rejected: 'unknown' };
    const withinGrace = stored.rotatedAt.getTime() >= now.getTime() - ROTATION_GRACE_MS;
    if (!withinGrace || successor.rotatedAt) {
      await tx.refreshToken.deleteMany({ where: { userId } });
      return { rejected: 'reused' };
    }
    if (siblings.length >= MAX_GRACE_SIBLINGS) return { rejected: 'graceExhausted' };

    return issue();
  });

  if ('issued' in outcome) {
    return { user: toSessionUser(user), ...sendTokens(res, outcome.issued) };
  }
  if (outcome.rejected === 'graceExhausted') {
    throw { status: 401, message: 'La sesión ya no es válida' };
  }
  if (outcome.rejected === 'unknown') {
    clearCookies(res);
    throw { status: 401, message: 'La sesión ya no es válida' };
  }
  clearCookies(res);
  throw {
    status: 401,
    message: 'Token de refresco no reconocido. Todas las sesiones han sido revocadas.',
  };
}

/**
 * Se identifica con el refresh token y no con el access token, para que funcione aunque este haya vencido: la firma
 * se verifica sin mirar el vencimiento solo para saber de qué usuario es. Borra la cadena entera del token (su fila y
 * todas las rotadas que lo precedieron). Si el token se rotó dentro de `ROTATION_GRACE_MS`, borra también sus sucesores
 * sin usar, por si la respuesta de esa rotación no llegó al cliente; fuera de la ventana, un token viejo no cierra la
 * sesión que lo reemplazó. Sin esas filas, un refresh posterior con cualquier token de la cadena da 401 sin revocar las otras
 * sesiones, en vez de parecer un reuso. Las cookies se borran antes de tocar la base y la respuesta es siempre la
 * misma: sin token, con uno inválido o ya revocado, o con dos logouts simultáneos.
 */
export async function logout(rawRefreshToken: string | undefined, res: Response) {
  clearCookies(res);

  const userId = rawRefreshToken ? refreshTokenOwner(rawRefreshToken) : null;
  if (rawRefreshToken && userId) {
    const tokenHash = hashRefreshToken(rawRefreshToken);
    await prisma.$transaction(async tx => {
      await lockUserSessions(tx, userId);
      const graceStart = new Date(Date.now() - ROTATION_GRACE_MS);
      const recentlyRotated = await tx.refreshToken.count({
        where: { userId, tokenHash, rotatedAt: { gte: graceStart } },
      });
      if (recentlyRotated > 0) {
        await tx.refreshToken.deleteMany({ where: { userId, previousTokenHash: tokenHash, rotatedAt: null } });
      }
      await deleteTokenChain(tx, userId, tokenHash);
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

/** Borra la fila del token y, recorriendo `previousTokenHash` hacia atrás, todas las rotadas de su cadena. */
async function deleteTokenChain(tx: PrismaTransactionClient, userId: string, tokenHash: string) {
  await tx.$executeRaw`
    WITH RECURSIVE chain AS (
      SELECT "id", "previousTokenHash" FROM "RefreshToken" WHERE "tokenHash" = ${tokenHash} AND "userId" = ${userId}
      UNION
      SELECT parent."id", parent."previousTokenHash"
      FROM "RefreshToken" parent
      JOIN chain ON parent."tokenHash" = chain."previousTokenHash"
      WHERE parent."userId" = ${userId}
    )
    DELETE FROM "RefreshToken" WHERE "id" IN (SELECT "id" FROM chain)`;
}

function refreshTokenOwner(rawRefreshToken: string): string | null {
  try {
    const payload = jwt.verify(rawRefreshToken, config.jwt.refreshSecret, {
      algorithms: [JWT_ALGORITHM],
      ignoreExpiration: true,
    });
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
    algorithm: JWT_ALGORITHM,
    expiresIn: config.jwt.accessTtlMs / 1000,
  });
  const refreshToken = jwt.sign({ sub: payload.sub }, config.jwt.refreshSecret, {
    algorithm: JWT_ALGORITHM,
    expiresIn: config.jwt.refreshTtlMs / 1000,
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
 * Solo lo aplica login: la rotación reemplaza una sesión por otra y las hermanas de la gracia están acotadas por
 * `MAX_GRACE_SIBLINGS`. Cuenta solo las sesiones vigentes: las filas rotadas quedan para detectar reusos y `login` y
 * `refresh` las podan al vencer.
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
