import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { CLIENT_HEADER, MOBILE_CLIENT } from '@omni/shared/auth';

import { hashRefreshToken } from '../../auth/auth.service';
import { prisma } from '../../common/db';
import { config } from '../../config';
import { authHeader } from '../../test/integration/auth';
import { createIntegrationApp } from '../../test/integration/createIntegrationApp';
import { TEST_PASSWORD, createUser, toJwtUser } from '../../test/integration/factories';
import { activeSessionCount, seedSession } from '../../test/integration/session';

const app = createIntegrationApp();

const DAY_MS = 24 * 60 * 60 * 1000;

function mobileRefresh(refreshToken: string) {
  return request(app).post('/api/auth/refresh').set(CLIENT_HEADER, MOBILE_CLIENT).send({ refreshToken });
}

function webRefresh(refreshToken: string) {
  return request(app).post('/api/auth/refresh').set('Cookie', `refresh_token=${refreshToken}`);
}

/** Milisegundos que le quedan al refresh token según su propio `exp`. */
function remainingMs(refreshToken: string) {
  const { exp } = jwt.decode(refreshToken) as jwt.JwtPayload & { exp: number };
  return exp * 1000 - Date.now();
}

/** Lo que le queda a la fila del token en la base: tiene que vencer junto con el JWT. */
async function storedRemainingMs(refreshToken: string) {
  const row = await prisma.refreshToken.findUniqueOrThrow({ where: { tokenHash: hashRefreshToken(refreshToken) } });
  return row.expiresAt.getTime() - Date.now();
}

/** Sesión de mobile emitida hace tiempo: su token vence en `remainingDays` días. */
async function seedAgedMobileSession(userId: string, remainingDays: number) {
  const exp = Math.floor((Date.now() + remainingDays * DAY_MS) / 1000);
  const refreshToken = jwt.sign({ sub: userId, exp }, config.jwt.refreshSecret, { jwtid: randomUUID() });
  await prisma.refreshToken.create({
    data: { userId, tokenHash: hashRefreshToken(refreshToken), expiresAt: new Date(exp * 1000), createdAt: new Date() },
  });
  return refreshToken;
}

function expectAbout(actualMs: number, expectedMs: number) {
  expect(Math.abs(actualMs - expectedMs)).toBeLessThan(60_000);
}

describe('sesión persistente de mobile (integración)', () => {
  describe('vigencia del refresh token', () => {
    it('el login de mobile emite un refresh token de 90 días y el de la web uno de 7', async () => {
      const user = await createUser({ username: 'vigencia' });
      const credentials = { username: 'vigencia', password: TEST_PASSWORD };

      const mobile = await request(app).post('/api/auth/login').set(CLIENT_HEADER, MOBILE_CLIENT).send(credentials);
      const web = await request(app).post('/api/auth/login').send(credentials);

      expect(mobile.status).toBe(200);
      expectAbout(remainingMs(mobile.body.refreshToken as string), config.jwt.mobileRefreshTtlMs);
      expectAbout(await storedRemainingMs(mobile.body.refreshToken as string), config.jwt.mobileRefreshTtlMs);
      expectAbout(remainingMs(web.body.refreshToken as string), config.jwt.refreshTtlMs);
      expect(await activeSessionCount(user.id)).toBe(2);
    });

    it('cada refresh de mobile emite un token con 90 días desde ese momento', async () => {
      const user = await createUser();
      const aged = await seedAgedMobileSession(user.id, 3);

      const res = await mobileRefresh(aged);

      expect(res.status).toBe(200);
      expectAbout(remainingMs(res.body.refreshToken as string), 90 * DAY_MS);
      expectAbout(await storedRemainingMs(res.body.refreshToken as string), 90 * DAY_MS);
    });

    it('el refresh de la web sigue en 7 días, igual que su cookie', async () => {
      const user = await createUser();
      const refreshToken = await seedSession(user);

      const res = await webRefresh(refreshToken);

      expect(res.status).toBe(200);
      expectAbout(remainingMs(res.body.refreshToken as string), 7 * DAY_MS);
      const cookies = res.headers['set-cookie'] as unknown as string[];
      const refreshCookie = cookies.find(
        cookie => cookie.startsWith('refresh_token=') && !cookie.startsWith('refresh_token=;')
      );
      expect(refreshCookie).toContain(`Max-Age=${7 * 24 * 60 * 60}`);
    });

    it('un refresh sin el header de mobile recibe la vigencia de la web', async () => {
      const user = await createUser();
      const aged = await seedAgedMobileSession(user.id, 60);

      const res = await request(app).post('/api/auth/refresh').send({ refreshToken: aged });

      expect(res.status).toBe(200);
      expectAbout(remainingMs(res.body.refreshToken as string), 7 * DAY_MS);
    });
  });

  describe('rotación con la vigencia de mobile', () => {
    it('el token rotado queda rechazado y su reuso, con el sucesor ya usado, revoca todas las sesiones', async () => {
      const user = await createUser();
      const first = await seedAgedMobileSession(user.id, 80);
      await seedSession(user);
      const second = await mobileRefresh(first);
      expect((await mobileRefresh(second.body.refreshToken as string)).status).toBe(200);

      const reused = await mobileRefresh(first);

      expect(reused.status).toBe(401);
      expect(await activeSessionCount(user.id)).toBe(0);
    });

    it('dentro de la gracia el reintento recibe una hermana con la vigencia de mobile', async () => {
      const user = await createUser();
      const first = await seedAgedMobileSession(user.id, 80);
      await mobileRefresh(first);

      const retried = await mobileRefresh(first);

      expect(retried.status).toBe(200);
      expectAbout(remainingMs(retried.body.refreshToken as string), 90 * DAY_MS);
    });
  });

  describe('POST /api/auth/logout-all', () => {
    it('revoca todas las sesiones del usuario y borra las cookies', async () => {
      const user = await createUser();
      const otherUser = await createUser();
      const phone = await seedAgedMobileSession(user.id, 80);
      const web = await seedSession(user);
      const unrelated = await seedSession(otherUser);

      const res = await request(app)
        .post('/api/auth/logout-all')
        .set('Authorization', authHeader(toJwtUser(user)));

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: 'Cerraste sesión en todos los dispositivos' });
      const cookies = res.headers['set-cookie'] as unknown as string[];
      expect(cookies.some(cookie => cookie.startsWith('refresh_token=;'))).toBe(true);
      expect(await prisma.refreshToken.count({ where: { userId: user.id } })).toBe(0);
      expect((await mobileRefresh(phone)).status).toBe(401);
      expect((await webRefresh(web)).status).toBe(401);
      expect((await webRefresh(unrelated)).status).toBe(200);
    });

    it('sin access token responde 401 y no toca las sesiones', async () => {
      const user = await createUser();
      await seedSession(user);

      const res = await request(app).post('/api/auth/logout-all');

      expect(res.status).toBe(401);
      expect(await activeSessionCount(user.id)).toBe(1);
    });
  });
});
