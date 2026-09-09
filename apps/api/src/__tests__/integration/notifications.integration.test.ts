import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';

import { prisma } from '../../common/db';
import { authHeader } from '../../test/integration/auth';
import { createIntegrationApp } from '../../test/integration/createIntegrationApp';
import { createExpenseReminder, createUser, createUserPreferences, toJwtUser } from '../../test/integration/factories';
import { withSavepoint } from '../../test/integration/withSavepoint';

const app = createIntegrationApp();

describe('notifications routes (integration)', () => {
  let user: Awaited<ReturnType<typeof createUser>>;
  let auth: string;

  beforeEach(async () => {
    user = await createUser({ username: 'notifications-owner' });
    auth = authHeader(toJwtUser(user));
  });

  describe('digest', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app).get('/api/notifications/digest');
      expect(res.status).toBe(401);
    });

    it('returns 401 with an unknown device token', async () => {
      const res = await request(app).get('/api/notifications/digest').set('Authorization', 'Bearer omni_pi_unknown');

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Device token inválido');
    });

    it('reports notifications as disabled when the user opted out', async () => {
      await createUserPreferences(user.id, { notifications: false });

      const res = await request(app).get('/api/notifications/digest').set('Authorization', auth);

      expect(res.status).toBe(200);
      expect(res.body.notificationsDisabled).toBe(true);
    });

    it('returns the digest for a user with notifications enabled', async () => {
      await createUserPreferences(user.id, { notifications: true });
      await createExpenseReminder(user.id, { title: 'Alquiler', dueDate: new Date('2020-01-01') });

      const res = await request(app).get('/api/notifications/digest').set('Authorization', auth);

      expect(res.status).toBe(200);
      expect(res.body.notificationsDisabled).toBeUndefined();
      expect(res.body.expenses.overdueCount).toBe(1);
    });

    it('accepts the api key handed out when registering a Raspberry Pi device', async () => {
      await createUserPreferences(user.id, { notifications: true });
      const registered = await request(app)
        .post('/api/notifications/devices')
        .set('Authorization', auth)
        .send({ platform: 'RASPBERRY_PI', label: 'Pi' });

      expect(registered.status).toBe(201);
      expect(registered.body.apiKey).toMatch(/^omni_pi_/);

      const res = await request(app)
        .get('/api/notifications/digest')
        .set('Authorization', `Bearer ${registered.body.apiKey}`);

      expect(res.status).toBe(200);
      expect(res.body.userId).toBe(user.id);
    });
  });

  describe('devices', () => {
    it('GET /devices returns 401 without auth', async () => {
      const res = await request(app).get('/api/notifications/devices');
      expect(res.status).toBe(401);
    });

    it('GET /devices lists the devices without leaking the token', async () => {
      await request(app)
        .post('/api/notifications/devices')
        .set('Authorization', auth)
        .send({ platform: 'WEB', token: 'web-token-1', label: 'Chrome' });

      const res = await request(app).get('/api/notifications/devices').set('Authorization', auth);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toMatchObject({ platform: 'WEB', label: 'Chrome', isActive: true });
      expect(res.body[0].token).toBeUndefined();
    });

    it('POST /devices stores the token hashed, never in plain text', async () => {
      const res = await request(app)
        .post('/api/notifications/devices')
        .set('Authorization', auth)
        .send({ platform: 'WEB', token: 'web-token-1', label: 'Chrome' });

      expect(res.status).toBe(201);
      const stored = await prisma.notificationDevice.findFirst({ where: { userId: user.id } });
      expect(stored?.token).not.toBe('web-token-1');
      expect(stored?.token).toHaveLength(64);
    });

    it('POST /devices rejects an invalid platform', async () => {
      const res = await request(app)
        .post('/api/notifications/devices')
        .set('Authorization', auth)
        .send({ platform: 'INVALID' });

      expect(res.status).toBe(400);
      expect(await prisma.notificationDevice.count()).toBe(0);
    });

    it('POST /devices requires a token for WEB', async () => {
      const res = await request(app)
        .post('/api/notifications/devices')
        .set('Authorization', auth)
        .send({ platform: 'WEB', label: 'Chrome' });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('El token es obligatorio para WEB y MOBILE');
    });

    it('POST /devices returns 409 when the same device is registered twice', async () => {
      await request(app)
        .post('/api/notifications/devices')
        .set('Authorization', auth)
        .send({ platform: 'WEB', token: 'web-token-1' });

      // El duplicado choca contra un unique constraint, que aborta la transacción que lo envuelve.
      const res = await withSavepoint(() =>
        request(app)
          .post('/api/notifications/devices')
          .set('Authorization', auth)
          .send({ platform: 'WEB', token: 'web-token-1' })
      );

      expect(res.status).toBe(409);
      expect(res.body.message).toBe('Este dispositivo ya está registrado');
      expect(await prisma.notificationDevice.count({ where: { userId: user.id } })).toBe(1);
    });

    it('DELETE /devices/:deviceId returns 204', async () => {
      const created = await request(app)
        .post('/api/notifications/devices')
        .set('Authorization', auth)
        .send({ platform: 'WEB', token: 'web-token-1' });

      const res = await request(app).delete(`/api/notifications/devices/${created.body.id}`).set('Authorization', auth);

      expect(res.status).toBe(204);
      expect(await prisma.notificationDevice.count({ where: { userId: user.id } })).toBe(0);
    });

    it('DELETE /devices/:deviceId returns 404 for a device of another user', async () => {
      const other = await createUser({ username: 'notifications-other' });
      const otherAuth = authHeader(toJwtUser(other));
      const created = await request(app)
        .post('/api/notifications/devices')
        .set('Authorization', otherAuth)
        .send({ platform: 'WEB', token: 'web-token-other' });

      const res = await request(app).delete(`/api/notifications/devices/${created.body.id}`).set('Authorization', auth);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Dispositivo no encontrado');
    });
  });
});
