import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { MAX_SESSIONS_PER_USER, ROTATION_GRACE_MS, hashRefreshToken } from '../../auth/auth.service';
import { prisma } from '../../common/db';
import { basePrisma, clearPrismaOverride } from '../../common/db/prisma';
import { config } from '../../config';
import { createIntegrationApp } from '../../test/integration/createIntegrationApp';
import { TEST_PASSWORD, createUser } from '../../test/integration/factories';
import { activeSessionCount, seedSession } from '../../test/integration/session';

const app = createIntegrationApp();

function refresh(refreshToken: string) {
  return request(app).post('/api/auth/refresh').send({ refreshToken });
}

function expectCookiesCleared(res: request.Response) {
  const cookies = res.headers['set-cookie'] as unknown as string[];
  expect(cookies.some(cookie => cookie.startsWith('access_token=;'))).toBe(true);
  expect(cookies.some(cookie => cookie.startsWith('refresh_token=;'))).toBe(true);
}

describe('sesión de la API (integración)', () => {
  describe('login', () => {
    it('guarda el sha256 del refresh token, que lleva un jti aleatorio', async () => {
      const user = await createUser({ username: 'sessionhash' });

      const res = await request(app).post('/api/auth/login').send({ username: 'sessionhash', password: TEST_PASSWORD });

      const refreshToken = res.body.refreshToken as string;
      expect(jwt.decode(refreshToken)).toMatchObject({ sub: user.id, jti: expect.any(String) });
      const stored = await prisma.refreshToken.findMany({ where: { userId: user.id } });
      expect(stored.map(row => row.tokenHash)).toEqual([hashRefreshToken(refreshToken)]);
    });

    it('poda las sesiones vencidas y borra las más viejas por encima del tope', async () => {
      const user = await createUser({ username: 'sessioncap' });
      const now = Date.now();
      await prisma.refreshToken.create({
        data: { userId: user.id, tokenHash: 'vencida', expiresAt: new Date(now - 1000), createdAt: new Date(now) },
      });
      await prisma.refreshToken.createMany({
        data: Array.from({ length: MAX_SESSIONS_PER_USER }, (_, index) => ({
          userId: user.id,
          tokenHash: `vigente-${index}`,
          expiresAt: new Date(now + 60_000),
          createdAt: new Date(now - (index + 1) * 1000),
        })),
      });

      const res = await request(app).post('/api/auth/login').send({ username: 'sessioncap', password: TEST_PASSWORD });

      const hashes = (await prisma.refreshToken.findMany({ where: { userId: user.id } })).map(row => row.tokenHash);
      expect(hashes).toHaveLength(MAX_SESSIONS_PER_USER);
      expect(hashes).toContain(hashRefreshToken(res.body.refreshToken as string));
      expect(hashes).not.toContain('vencida');
      expect(hashes).not.toContain(`vigente-${MAX_SESSIONS_PER_USER - 1}`);
    });
  });

  describe('logout', () => {
    it('funciona con el access token vencido: se identifica con el refresh token', async () => {
      const user = await createUser();
      const refreshToken = await seedSession(user);
      const expiredAccess = jwt.sign(
        { sub: user.id, username: user.username, role: user.role, exp: Math.floor(Date.now() / 1000) - 60 },
        config.jwt.accessSecret
      );

      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${expiredAccess}`)
        .set('Cookie', `refresh_token=${refreshToken}`);

      expect(res.status).toBe(200);
      expectCookiesCleared(res);
      expect(await activeSessionCount(user.id)).toBe(0);
    });

    it('sin refresh token, con uno desconocido o con un body inválido responde 200 y borra las cookies', async () => {
      const user = await createUser();
      await seedSession(user);
      const forged = jwt.sign({ sub: user.id }, 'otro-secreto-de-al-menos-32-caracteres', { jwtid: randomUUID() });

      const responses = [
        await request(app).post('/api/auth/logout'),
        await request(app).post('/api/auth/logout').send({ refreshToken: 'no-es-un-token' }),
        await request(app).post('/api/auth/logout').send({ refreshToken: forged }),
        await request(app).post('/api/auth/logout').send({ refreshToken: 123 }),
      ];

      for (const res of responses) {
        expect(res.status).toBe(200);
        expectCookiesCleared(res);
      }
      expect(await activeSessionCount(user.id)).toBe(1);
    });

    it('el token del body tiene prioridad sobre la cookie, y un body inválido cae a la cookie', async () => {
      const user = await createUser();
      const fromBody = await seedSession(user);
      const fromCookie = await seedSession(user);

      await request(app)
        .post('/api/auth/logout')
        .set('Cookie', `refresh_token=${fromCookie}`)
        .send({ refreshToken: fromBody });

      const remaining = await prisma.refreshToken.findMany({ where: { userId: user.id } });
      expect(remaining.map(row => row.tokenHash)).toEqual([hashRefreshToken(fromCookie)]);

      await request(app)
        .post('/api/auth/logout')
        .set('Cookie', `refresh_token=${fromCookie}`)
        .send({ refreshToken: '' });
      expect(await activeSessionCount(user.id)).toBe(0);
    });

    it('con un token recién rotado también cierra la sesión del sucesor', async () => {
      const user = await createUser();
      const first = await seedSession(user);
      await refresh(first);

      const res = await request(app).post('/api/auth/logout').send({ refreshToken: first });

      expect(res.status).toBe(200);
      expect(await activeSessionCount(user.id)).toBe(0);
    });

    it('fuera de la ventana de gracia, un token rotado no cierra la sesión que lo reemplazó', async () => {
      const user = await createUser();
      const first = await seedSession(user);
      const successor = await refresh(first);
      await prisma.refreshToken.update({
        where: { tokenHash: hashRefreshToken(first) },
        data: { rotatedAt: new Date(Date.now() - ROTATION_GRACE_MS - 1000) },
      });

      await request(app).post('/api/auth/logout').send({ refreshToken: first });

      expect(await activeSessionCount(user.id)).toBe(1);
      expect((await refresh(successor.body.refreshToken as string)).status).toBe(200);
    });

    it('borra la cadena entera: un token viejo de esa sesión da 401 sin revocar las otras', async () => {
      const user = await createUser();
      const first = await seedSession(user);
      const otherDevice = await seedSession(user);
      const second = await refresh(first);
      const third = await refresh(second.body.refreshToken as string);

      await request(app)
        .post('/api/auth/logout')
        .send({ refreshToken: third.body.refreshToken as string });

      expect(await prisma.refreshToken.count({ where: { userId: user.id } })).toBe(1);
      for (const stale of [first, second.body.refreshToken as string]) {
        const res = await refresh(stale);
        expect(res.status).toBe(401);
        expect(res.body.message).toBe('La sesión ya no es válida');
      }
      expect((await refresh(otherDevice)).status).toBe(200);
    });
  });

  describe('refresh con un token que ya no está en la base', () => {
    it('un token rotado cuyo sucesor fue expulsado da 401 sin revocar las otras sesiones', async () => {
      const user = await createUser();
      const first = await seedSession(user);
      const otherDevice = await seedSession(user);
      const successor = await refresh(first);
      await prisma.refreshToken.delete({
        where: { tokenHash: hashRefreshToken(successor.body.refreshToken as string) },
      });

      const res = await refresh(first);

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('La sesión ya no es válida');
      expect((await refresh(otherDevice)).status).toBe(200);
    });

    it('un token que ya no está en la base da 401 sin revocar las otras sesiones', async () => {
      const user = await createUser();
      const evicted = await seedSession(user);
      const other = await seedSession(user);
      await prisma.refreshToken.delete({ where: { tokenHash: hashRefreshToken(evicted) } });

      const res = await refresh(evicted);

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('La sesión ya no es válida');
      expect((await refresh(other)).status).toBe(200);
    });

    it('un refresh en vuelo después del logout de otra pestaña no revoca las otras sesiones', async () => {
      const user = await createUser();
      const tab = await seedSession(user);
      const otherDevice = await seedSession(user);
      await request(app).post('/api/auth/logout').send({ refreshToken: tab });

      const res = await refresh(tab);

      expect(res.status).toBe(401);
      expect((await refresh(otherDevice)).status).toBe(200);
    });
  });

  /**
   * Fuera de la transacción de test: con ella, todas las requests comparten una conexión y nunca compiten por un
   * lock. Acá cada request usa su propia conexión, así que los datos se commitean y se borran a mano.
   */
  describe('concurrencia real', () => {
    it('dos refresh simultáneos con el mismo token responden 200 y no revocan la sesión', async () => {
      clearPrismaOverride();
      const id = `concurrent-${randomUUID()}`;
      const user = await basePrisma.user.create({
        data: { id, username: id, name: 'Test User', password: 'sin-uso', role: 'USER' },
      });

      try {
        const refreshToken = await seedSession(user);

        const [first, second] = await Promise.all([refresh(refreshToken), refresh(refreshToken)]);

        expect(first.status).toBe(200);
        expect(second.status).toBe(200);
        expect(await basePrisma.refreshToken.count({ where: { userId: id, rotatedAt: null } })).toBe(2);
      } finally {
        await basePrisma.user.delete({ where: { id } });
      }
    });
  });
});
