import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { prisma } from '../../common/db';
import { createIntegrationApp } from '../../test/integration/createIntegrationApp';
import { TEST_PASSWORD, createUser } from '../../test/integration/factories';

const app = createIntegrationApp();

describe('users routes (integration)', () => {
  describe('PATCH /password', () => {
    it('revoca todos los refresh tokens del usuario', async () => {
      const user = await createUser({ username: 'passwordrevoke' });
      const credentials = { username: 'passwordrevoke', password: TEST_PASSWORD };
      const current = await request(app).post('/api/auth/login').send(credentials);
      const other = await request(app).post('/api/auth/login').send(credentials);

      const res = await request(app)
        .patch('/api/users/password')
        .set('Authorization', `Bearer ${current.body.accessToken as string}`)
        .send({ newPassword: 'nueva-password-456' });

      expect(res.status).toBe(200);
      expect(await prisma.refreshToken.count({ where: { userId: user.id } })).toBe(0);
      const stale = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: other.body.refreshToken as string });
      expect(stale.status).toBe(401);
    });
  });
});
