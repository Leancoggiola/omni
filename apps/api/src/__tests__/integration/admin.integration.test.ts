import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';

import { prisma } from '../../common/db';
import { authHeader } from '../../test/integration/auth';
import { createIntegrationApp } from '../../test/integration/createIntegrationApp';
import { createUser, toJwtUser } from '../../test/integration/factories';

const app = createIntegrationApp();

describe('admin users routes (integration)', () => {
  let adminAuth: string;
  let admin: Awaited<ReturnType<typeof createUser>>;

  beforeEach(async () => {
    admin = await createUser({ username: 'adminuser', role: 'ADMIN' });
    adminAuth = authHeader(toJwtUser(admin));
  });

  describe('acceso', () => {
    it('devuelve 401 sin auth', async () => {
      const res = await request(app).get('/api/admin/users');

      expect(res.status).toBe(401);
    });

    it('devuelve 403 a un usuario sin rol ADMIN', async () => {
      const user = await createUser({ username: 'regularuser' });

      const res = await request(app)
        .get('/api/admin/users')
        .set('Authorization', authHeader(toJwtUser(user)));

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/admin/users', () => {
    it('lista los usuarios sin exponer la contraseña', async () => {
      await createUser({ username: 'listeduser', name: 'Listed User' });

      const res = await request(app).get('/api/admin/users').set('Authorization', adminAuth);

      expect(res.status).toBe(200);
      const usernames = res.body.users.map((u: { username: string }) => u.username);
      expect(usernames).toEqual(expect.arrayContaining(['adminuser', 'listeduser']));
      for (const user of res.body.users) {
        expect(user).not.toHaveProperty('password');
      }
    });
  });

  describe('POST /api/admin/users', () => {
    const payload = { username: 'newuser01', name: 'New User', password: 'password123' };

    it('crea un usuario con rol USER por defecto y sin devolver la contraseña', async () => {
      const res = await request(app).post('/api/admin/users').set('Authorization', adminAuth).send(payload);

      expect(res.status).toBe(201);
      expect(res.body.user).toMatchObject({ username: 'newuser01', name: 'New User', role: 'USER' });
      expect(res.body.user).not.toHaveProperty('password');
    });

    it('rechaza un username repetido con 409', async () => {
      await createUser({ username: 'newuser01' });

      const res = await request(app).post('/api/admin/users').set('Authorization', adminAuth).send(payload);

      expect(res.status).toBe(409);
      expect(res.body.message).toBe('El nombre de usuario ya está en uso');
    });

    it('rechaza un email repetido con 409', async () => {
      await createUser({ username: 'otheruser', email: 'taken@example.com' });

      const res = await request(app)
        .post('/api/admin/users')
        .set('Authorization', adminAuth)
        .send({ ...payload, email: 'taken@example.com' });

      expect(res.status).toBe(409);
      expect(res.body.message).toBe('El correo electrónico ya está en uso');
    });

    it('rechaza un body inválido con 400', async () => {
      const res = await request(app)
        .post('/api/admin/users')
        .set('Authorization', adminAuth)
        .send({ username: 'abc', name: 'N', password: 'short' });

      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/admin/users/:id', () => {
    it('elimina un usuario USER', async () => {
      const target = await createUser({ username: 'deleteme01' });

      const res = await request(app).delete(`/api/admin/users/${target.id}`).set('Authorization', adminAuth);

      expect(res.status).toBe(200);
      expect(await prisma.user.findUnique({ where: { id: target.id } })).toBeNull();
    });

    it('rechaza eliminar a otro ADMIN con 403 y no lo borra', async () => {
      const otherAdmin = await createUser({ username: 'otheradmin', role: 'ADMIN' });

      const res = await request(app).delete(`/api/admin/users/${otherAdmin.id}`).set('Authorization', adminAuth);

      expect(res.status).toBe(403);
      expect(res.body.message).toBe('No se puede eliminar a un administrador');
      expect(await prisma.user.findUnique({ where: { id: otherAdmin.id } })).not.toBeNull();
    });

    it('rechaza eliminar la propia cuenta con 400', async () => {
      const res = await request(app).delete(`/api/admin/users/${admin.id}`).set('Authorization', adminAuth);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('No podés eliminar tu propia cuenta');
    });

    it('devuelve 404 si el usuario no existe', async () => {
      const res = await request(app).delete('/api/admin/users/no-existe').set('Authorization', adminAuth);

      expect(res.status).toBe(404);
    });
  });
});
