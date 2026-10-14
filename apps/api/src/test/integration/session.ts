import type { Response } from 'express';

import { login } from '../../auth/auth.service';
import { prisma } from '../../common/db';
import type { User } from '../../generated/prisma/client';

const ignoredResponse = { cookie: () => undefined, clearCookie: () => undefined } as unknown as Response;

/**
 * Crea la sesión con el `login` del service y no con `/login`: los limiters de auth viven en memoria por archivo
 * de test (10 logins y 20 refresh por IP) y solo los tests del propio login usan la ruta.
 */
export async function seedSession(user: User): Promise<string> {
  const { refreshToken } = await login({ ...user, preferences: null }, ignoredResponse);
  return refreshToken;
}

/** Sesiones vigentes: las filas rotadas quedan en la base hasta vencer, para reconocer un reuso. */
export function activeSessionCount(userId: string) {
  return prisma.refreshToken.count({ where: { userId, rotatedAt: null } });
}
