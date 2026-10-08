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
