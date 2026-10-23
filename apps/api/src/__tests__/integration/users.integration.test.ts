import { compare } from 'bcrypt';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { prisma } from '../../common/db';
import { createIntegrationApp } from '../../test/integration/createIntegrationApp';
import { TEST_PASSWORD, createUser } from '../../test/integration/factories';

const app = createIntegrationApp();

const NEW_PASSWORD = 'nueva-password-456';

describe('users routes (integration)', () => {
  describe('PATCH /password', () => {
    const loginAs = async (username: string) => {
      const res = await request(app).post('/api/auth/login').send({ username, password: TEST_PASSWORD });
      return res.body as { accessToken: string; refreshToken: string };
    };

    it('con la contraseña actual cambia la contraseña y revoca todos los refresh tokens', async () => {
      const user = await createUser({ username: 'passwordrevoke' });
      const current = await loginAs('passwordrevoke');
      const other = await loginAs('passwordrevoke');

      const res = await request(app)
        .patch('/api/users/password')
        .set('Authorization', `Bearer ${current.accessToken}`)
        .send({ currentPassword: TEST_PASSWORD, newPassword: NEW_PASSWORD });

      expect(res.status).toBe(200);
      const stored = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
      expect(await compare(NEW_PASSWORD, stored.password)).toBe(true);
      expect(await prisma.refreshToken.count({ where: { userId: user.id } })).toBe(0);
      const stale = await request(app).post('/api/auth/refresh').send({ refreshToken: other.refreshToken });
      expect(stale.status).toBe(401);
    });

    it('con una contraseña actual incorrecta responde 400 y no cambia nada', async () => {
      const user = await createUser({ username: 'passwordwrong' });
      const session = await loginAs('passwordwrong');

      const res = await request(app)
        .patch('/api/users/password')
        .set('Authorization', `Bearer ${session.accessToken}`)
        .send({ currentPassword: 'no-es-la-actual', newPassword: NEW_PASSWORD });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('La contraseña actual es incorrecta');
      const stored = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
      expect(await compare(TEST_PASSWORD, stored.password)).toBe(true);
      expect(await prisma.refreshToken.count({ where: { userId: user.id } })).toBe(1);
    });

    it('sin currentPassword rechaza el body', async () => {
      await createUser({ username: 'passwordmissing' });
      const session = await loginAs('passwordmissing');

      const res = await request(app)
        .patch('/api/users/password')
        .set('Authorization', `Bearer ${session.accessToken}`)
        .send({ newPassword: NEW_PASSWORD });

      expect(res.status).toBe(400);
    });

    it('rechaza una contraseña nueva de más de 72 caracteres', async () => {
      await createUser({ username: 'passwordlong' });
      const session = await loginAs('passwordlong');

      const res = await request(app)
        .patch('/api/users/password')
        .set('Authorization', `Bearer ${session.accessToken}`)
        .send({ currentPassword: TEST_PASSWORD, newPassword: 'x'.repeat(73) });

      expect(res.status).toBe(400);
    });
  });
});
