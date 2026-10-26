import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';

import { MAX_SESSIONS_PER_USER, ROTATION_GRACE_MS, hashRefreshToken } from '../../auth/auth.service';
import { prisma } from '../../common/db';
import { logger } from '../../common/utils/logger';
import { config } from '../../config';
import { createIntegrationApp } from '../../test/integration/createIntegrationApp';
import { createUser } from '../../test/integration/factories';
import { activeSessionCount, seedSession } from '../../test/integration/session';

const app = createIntegrationApp();

function refresh(refreshToken: string) {
  return request(app).post('/api/auth/refresh').send({ refreshToken });
}

/** Mueve la rotación del token fuera de la ventana de gracia, como si la app volviera a abrirse un rato después. */
async function expireGrace(refreshToken: string) {
  await prisma.refreshToken.update({
    where: { tokenHash: hashRefreshToken(refreshToken) },
    data: { rotatedAt: new Date(Date.now() - ROTATION_GRACE_MS - 1000) },
  });
}

/**
 * Las hipótesis de una sesión de mobile que se cierra sola: cada una tiene que dejar su motivo en el log, y solo un
 * reuso comprobado puede revocar las sesiones de los otros dispositivos.
 */
describe('refresh rechazado: motivos y alcance (integración)', () => {
  let warn: MockInstance;
  let info: MockInstance;

  beforeEach(() => {
    warn = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
    info = vi.spyOn(logger, 'info').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function rejectionsLogged() {
    return warn.mock.calls.filter(([, message]) => message === 'Refresh rechazado').map(([fields]) => fields);
  }

  describe('rotación cuya respuesta no llegó a guardarse', () => {
    it('fuera de la gracia, con el sucesor sin usar, recibe un par nuevo sin tocar las otras sesiones', async () => {
      const user = await createUser();
      const phone = await seedSession(user);
      const web = await seedSession(user);
      const lost = await refresh(phone);
      expect(lost.status).toBe(200);
      await expireGrace(phone);

      const recovered = await refresh(phone);

      expect(recovered.status).toBe(200);
      expect(rejectionsLogged()).toEqual([]);
      expect(await activeSessionCount(user.id)).toBe(2);
      expect((await refresh(recovered.body.refreshToken as string)).status).toBe(200);
      expect((await refresh(web)).status).toBe(200);
    });

    it('el sucesor perdido deja de valer: usarlo da 401 sin revocar las otras sesiones', async () => {
      const user = await createUser();
      const phone = await seedSession(user);
      const web = await seedSession(user);
      const lost = await refresh(phone);
      await expireGrace(phone);
      await refresh(phone);

      const res = await refresh(lost.body.refreshToken as string);

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('La sesión ya no es válida');
      expect(rejectionsLogged()).toEqual([{ reason: 'notFound', userId: user.id }]);
      expect((await refresh(web)).status).toBe(200);
    });

    it('recuperada la rotación, el token viejo vuelve a ser un reuso en cuanto se usa el par nuevo', async () => {
      const user = await createUser();
      const phone = await seedSession(user);
      await seedSession(user);
      await refresh(phone);
      await expireGrace(phone);
      const recovered = await refresh(phone);
      expect((await refresh(recovered.body.refreshToken as string)).status).toBe(200);

      const reused = await refresh(phone);

      expect(reused.status).toBe(401);
      expect(reused.body.message).toBe('Token de refresco no reconocido. Todas las sesiones han sido revocadas.');
      expect(rejectionsLogged()).toEqual([{ reason: 'reused', userId: user.id, rotatedAgoMs: expect.any(Number) }]);
      expect(await activeSessionCount(user.id)).toBe(0);
    });

    it('fuera de la gracia, si una hermana ya se usó es un reuso y revoca todas las sesiones', async () => {
      const user = await createUser();
      const phone = await seedSession(user);
      await seedSession(user);
      await refresh(phone);
      const sibling = await refresh(phone);
      expect((await refresh(sibling.body.refreshToken as string)).status).toBe(200);
      await expireGrace(phone);

      const reused = await refresh(phone);

      expect(reused.status).toBe(401);
      expect(rejectionsLogged()).toEqual([{ reason: 'reused', userId: user.id, rotatedAgoMs: expect.any(Number) }]);
      expect(await activeSessionCount(user.id)).toBe(0);
    });
  });

  describe('refresh repetido durante un cold start', () => {
    it('el reintento dentro de la gracia recibe una hermana y el sucesor sigue valiendo', async () => {
      const user = await createUser();
      const phone = await seedSession(user);
      const processed = await refresh(phone);

      const retried = await refresh(phone);

      expect(retried.status).toBe(200);
      expect(rejectionsLogged()).toEqual([]);
      expect((await refresh(processed.body.refreshToken as string)).status).toBe(200);
    });

    it('el reintento fuera de la gracia, sin que nadie haya usado la respuesta, tampoco cierra la sesión', async () => {
      const user = await createUser();
      const phone = await seedSession(user);
      await refresh(phone);
      await expireGrace(phone);

      const retried = await refresh(phone);

      expect(retried.status).toBe(200);
      expect(await activeSessionCount(user.id)).toBe(1);
    });
  });

  describe('tope de sesiones', () => {
    it('la sesión expulsada por logins nuevos da 401 sin revocar las otras y deja el motivo en el log', async () => {
      const user = await createUser();
      const phone = await seedSession(user);
      const others: string[] = [];
      for (let index = 0; index < MAX_SESSIONS_PER_USER; index += 1) {
        others.push(await seedSession(user));
      }

      const res = await refresh(phone);

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('La sesión ya no es válida');
      expect(info).toHaveBeenCalledWith({ userId: user.id, evicted: 1 }, 'Sesiones expulsadas por el tope');
      expect(rejectionsLogged()).toEqual([{ reason: 'notFound', userId: user.id }]);
      expect(await activeSessionCount(user.id)).toBe(MAX_SESSIONS_PER_USER);
      expect((await refresh(others[0] as string)).status).toBe(200);
    });
  });

  describe('token que la estrategia rechaza', () => {
    it('un refresh token vencido da 401, loguea el usuario y no toca las otras sesiones', async () => {
      const user = await createUser();
      const web = await seedSession(user);
      const expired = jwt.sign({ sub: user.id, exp: Math.floor(Date.now() / 1000) - 60 }, config.jwt.refreshSecret, {
        jwtid: randomUUID(),
      });

      const res = await refresh(expired);

      expect(res.status).toBe(401);
      expect(rejectionsLogged()).toEqual([{ reason: 'expired', userId: user.id }]);
      expect((await refresh(web)).status).toBe(200);
    });

    it('sin token o con una firma inválida loguea el motivo sin usuario', async () => {
      const forged = jwt.sign({ sub: 'alguien' }, 'otro-secreto-de-al-menos-32-caracteres', { jwtid: randomUUID() });

      expect((await request(app).post('/api/auth/refresh').send({})).status).toBe(401);
      expect((await refresh(forged)).status).toBe(401);

      expect(rejectionsLogged()).toEqual([{ reason: 'missing' }, { reason: 'invalid' }]);
    });

    it('el log nunca lleva el token ni su hash', async () => {
      const user = await createUser();
      const phone = await seedSession(user);
      await prisma.refreshToken.delete({ where: { tokenHash: hashRefreshToken(phone) } });

      await refresh(phone);

      const logged = JSON.stringify(warn.mock.calls);
      expect(logged).not.toContain(phone);
      expect(logged).not.toContain(hashRefreshToken(phone));
    });
  });
});
