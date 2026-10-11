import { describe, expect, it } from 'vitest';
import request from 'supertest';

import { prisma } from '../../common/db';
import { createIntegrationApp } from '../../test/integration/createIntegrationApp';
import { TEST_PASSWORD, createUser } from '../../test/integration/factories';

const app = createIntegrationApp();

describe('auth routes (integration)', () => {
  describe('POST /login', () => {
    it('devuelve la sesión con el tema de las preferencias y persiste un solo refresh token', async () => {
      const user = await createUser({ username: 'loginowner' });
      await prisma.userPreferences.create({ data: { userId: user.id, theme: 'dark' } });

      const res = await request(app).post('/api/auth/login').send({ username: 'loginowner', password: TEST_PASSWORD });

      expect(res.status).toBe(200);
      expect(res.body.user).toEqual({
        username: 'loginowner',
        name: 'Test User',
        email: null,
        role: 'USER',
        avatarUrl: null,
        theme: 'dark',
      });
      expect(res.body.accessToken).toEqual(expect.any(String));
      expect(res.body.refreshToken).toEqual(expect.any(String));
      expect(await prisma.refreshToken.count({ where: { userId: user.id } })).toBe(1);
    });

    it('setea la cookie de refresh con path /api/auth, que cubre refresh y logout', async () => {
      await createUser({ username: 'logincookies' });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'logincookies', password: TEST_PASSWORD });

      const cookies = res.headers['set-cookie'] as unknown as string[];
      const refresh = cookies.find(cookie => cookie.startsWith('refresh_token='));
      const access = cookies.find(cookie => cookie.startsWith('access_token='));
      expect(refresh).toContain('Path=/api/auth;');
      expect(refresh).toContain('HttpOnly');
      expect(access).toContain('Path=/api;');
    });

    it('usa el tema por defecto cuando el usuario no tiene preferencias', async () => {
      await createUser({ username: 'loginnoprefs' });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'loginnoprefs', password: TEST_PASSWORD });

      expect(res.status).toBe(200);
      expect(res.body.user.theme).toBe('light');
    });

    it('rechaza credenciales inválidas sin emitir tokens', async () => {
      const user = await createUser({ username: 'loginwrongpass' });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'loginwrongpass', password: 'otra-password-123' });

      expect(res.status).toBe(401);
      expect(res.body.accessToken).toBeUndefined();
      expect(await prisma.refreshToken.count({ where: { userId: user.id } })).toBe(0);
    });
  });

  describe('POST /logout', () => {
    it('la web (solo cookie, sin body) cierra únicamente su sesión y deja viva la de otro dispositivo', async () => {
      const user = await createUser({ username: 'logoutcookie' });
      const credentials = { username: 'logoutcookie', password: TEST_PASSWORD };
      const web = await request(app).post('/api/auth/login').send(credentials);
      const mobile = await request(app).post('/api/auth/login').send(credentials);
      expect(await prisma.refreshToken.count({ where: { userId: user.id } })).toBe(2);

      const webCookies = web.headers['set-cookie'] as unknown as string[];
      const refreshCookie = webCookies.find(cookie => cookie.startsWith('refresh_token='))!.split(';')[0]!;
      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${web.body.accessToken as string}`)
        .set('Cookie', refreshCookie);

      expect(res.status).toBe(200);
      const remaining = await prisma.refreshToken.findMany({ where: { userId: user.id } });
      expect(remaining).toHaveLength(1);
      const stillValid = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: mobile.body.refreshToken as string });
      expect(stillValid.status).toBe(200);
      const clearing = res.headers['set-cookie'] as unknown as string[];
      expect(clearing.filter(cookie => cookie.startsWith('refresh_token=;'))).toHaveLength(2);
    });

    it('es idempotente: dos logouts simultáneos con el mismo refresh token responden 200', async () => {
      const user = await createUser({ username: 'logouttwice' });
      const login = await request(app)
        .post('/api/auth/login')
        .send({ username: 'logouttwice', password: TEST_PASSWORD });
      const { accessToken, refreshToken } = login.body as { accessToken: string; refreshToken: string };

      const logout = () =>
        request(app).post('/api/auth/logout').set('Authorization', `Bearer ${accessToken}`).send({ refreshToken });
      const [first, second] = await Promise.all([logout(), logout()]);

      expect(first.status).toBe(200);
      expect(second.status).toBe(200);
      expect(await prisma.refreshToken.count({ where: { userId: user.id } })).toBe(0);
    });
  });
});
