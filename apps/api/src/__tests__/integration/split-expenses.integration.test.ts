import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';

import { prisma } from '../../common/db';
import { authHeader } from '../../test/integration/auth';
import { createIntegrationApp } from '../../test/integration/createIntegrationApp';
import { createFriend, createGathering, createUser, toJwtUser } from '../../test/integration/factories';
import { findRecordedCall } from '../../test/integration/queryRecorder';
import { withSavepoint } from '../../test/integration/withSavepoint';

const app = createIntegrationApp();

describe('split-expenses routes (integration)', () => {
  let user: Awaited<ReturnType<typeof createUser>>;
  let auth: string;

  beforeEach(async () => {
    user = await createUser({ username: 'split-owner' });
    auth = authHeader(toJwtUser(user));
  });

  describe('auth', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app).get('/api/split-expenses/friends');
      expect(res.status).toBe(401);
    });

    it('returns 401 with a token signed by a different secret', async () => {
      const res = await request(app).get('/api/split-expenses/friends').set('Authorization', 'Bearer not-a-real-token');
      expect(res.status).toBe(401);
    });
  });

  describe('friends', () => {
    it('GET /friends lists only the friends of the authenticated user', async () => {
      await createFriend(user.id, { name: 'Ana', alias: 'ana123' });
      const other = await createUser({ username: 'other-owner' });
      await createFriend(other.id, { name: 'Intruder' });

      const res = await request(app).get('/api/split-expenses/friends').set('Authorization', auth);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toMatchObject({ name: 'Ana', alias: 'ana123' });
    });

    it('GET /friends/suggest requires q', async () => {
      const res = await request(app).get('/api/split-expenses/friends/suggest').set('Authorization', auth);
      expect(res.status).toBe(400);
    });

    it('GET /friends/suggest matches by name', async () => {
      await createFriend(user.id, { name: 'Anabel' });
      await createFriend(user.id, { name: 'Bruno' });

      const res = await request(app).get('/api/split-expenses/friends/suggest?q=ana').set('Authorization', auth);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toMatchObject({ name: 'Anabel' });
    });

    it('POST /friends persists the friend', async () => {
      const res = await request(app)
        .post('/api/split-expenses/friends')
        .set('Authorization', auth)
        .send({ name: 'Ana', alias: 'ana123' });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ name: 'Ana', alias: 'ana123' });

      const stored = await prisma.splitFriend.findMany({ where: { userId: user.id } });
      expect(stored).toHaveLength(1);
      expect(stored[0]).toMatchObject({ name: 'Ana', nameNormalized: 'ana' });
    });

    it('POST /friends returns 400 on an invalid payload', async () => {
      const res = await request(app).post('/api/split-expenses/friends').set('Authorization', auth).send({});
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Error de validación');
    });

    it.each([
      ['shorter than the minimum', 'ana'],
      ['longer than the maximum', 'a'.repeat(21)],
      ['using unsupported characters', 'ana bella!'],
    ])('POST /friends returns 400 for an alias %s', async (_case, alias) => {
      const res = await request(app)
        .post('/api/split-expenses/friends')
        .set('Authorization', auth)
        .send({ name: 'Ana', alias });

      expect(res.status).toBe(400);
      expect(res.body.errors.alias).toBeDefined();
    });

    it('POST /friends returns 409 on a duplicate name', async () => {
      await createFriend(user.id, { name: 'Ana' });

      const res = await request(app)
        .post('/api/split-expenses/friends')
        .set('Authorization', auth)
        .send({ name: 'ana', alias: 'ana456' });

      expect(res.status).toBe(409);
      expect(res.body.message).toBe('Ya existe un amigo con ese nombre');
    });

    it('PATCH /friends/:friendId updates the friend', async () => {
      const friend = await createFriend(user.id, { name: 'Ana' });

      const res = await request(app)
        .patch(`/api/split-expenses/friends/${friend.id}`)
        .set('Authorization', auth)
        .send({ name: 'Ana María' });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ name: 'Ana María' });
    });

    it('DELETE /friends/:friendId returns 204 and removes the row', async () => {
      const friend = await createFriend(user.id, { name: 'Ana' });

      const res = await request(app).delete(`/api/split-expenses/friends/${friend.id}`).set('Authorization', auth);

      expect(res.status).toBe(204);
      expect(await prisma.splitFriend.findUnique({ where: { id: friend.id } })).toBeNull();
    });

    it('DELETE /friends/:friendId returns 404 for a friend of another user', async () => {
      const other = await createUser({ username: 'other-owner' });
      const friend = await createFriend(other.id, { name: 'Ana' });

      const res = await request(app).delete(`/api/split-expenses/friends/${friend.id}`).set('Authorization', auth);

      expect(res.status).toBe(404);
    });
  });

  describe('gatherings', () => {
    it('GET /gatherings returns a paginated list scoped to the user', async () => {
      await createGathering(user.id, { name: 'Asado' });
      const other = await createUser({ username: 'other-owner' });
      await createGathering(other.id, { name: 'Ajeno' });

      const res = await request(app).get('/api/split-expenses/gatherings').set('Authorization', auth);

      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(1);
      expect(res.body).toMatchObject({ total: 1, page: 1, limit: 50 });
    });

    it('GET /gatherings/:id returns the detail', async () => {
      const gathering = await createGathering(user.id, { name: 'Asado', participants: ['Ana', 'Bruno'] });

      const res = await request(app).get(`/api/split-expenses/gatherings/${gathering.id}`).set('Authorization', auth);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ id: gathering.id, name: 'Asado', isSettled: false });
      expect(res.body.participants).toHaveLength(2);
    });

    it('GET /gatherings/:id returns 404 when it belongs to another user', async () => {
      const other = await createUser({ username: 'other-owner' });
      const gathering = await createGathering(other.id, { name: 'Ajeno' });

      const res = await request(app).get(`/api/split-expenses/gatherings/${gathering.id}`).set('Authorization', auth);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Juntada no encontrada');
    });

    it('POST /gatherings persists the gathering and its participants', async () => {
      const res = await request(app)
        .post('/api/split-expenses/gatherings')
        .set('Authorization', auth)
        .send({ name: 'Asado', date: '2026-08-10', participants: [{ name: 'Ana' }, { name: 'Bruno' }] });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ name: 'Asado', date: '2026-08-10' });

      const stored = await prisma.gathering.findMany({ where: { userId: user.id }, include: { participants: true } });
      expect(stored).toHaveLength(1);
      expect(stored[0]?.participants).toHaveLength(2);
    });

    it('POST /gatherings returns 409 on duplicate participants', async () => {
      const res = await request(app)
        .post('/api/split-expenses/gatherings')
        .set('Authorization', auth)
        .send({ name: 'Asado', date: '2026-08-10', participants: [{ name: 'Ana' }, { name: 'Ana' }] });

      expect(res.status).toBe(409);
      expect(res.body.message).toBe('Participantes duplicados en la juntada');
    });

    it('PATCH /gatherings/:id/settled toggles the flag', async () => {
      const gathering = await createGathering(user.id, { participants: ['Ana'] });

      const res = await request(app)
        .patch(`/api/split-expenses/gatherings/${gathering.id}/settled`)
        .set('Authorization', auth)
        .send({ isSettled: true });

      expect(res.status).toBe(200);
      expect(res.body.isSettled).toBe(true);
      const stored = await prisma.gathering.findUnique({ where: { id: gathering.id } });
      expect(stored?.isSettled).toBe(true);
      expect(stored?.settledAt).not.toBeNull();
    });

    it('DELETE /gatherings/:id returns 204 and cascades', async () => {
      const gathering = await createGathering(user.id, { participants: ['Ana'] });

      const res = await request(app)
        .delete(`/api/split-expenses/gatherings/${gathering.id}`)
        .set('Authorization', auth);

      expect(res.status).toBe(204);
      expect(await prisma.gatheringParticipant.count({ where: { gatheringId: gathering.id } })).toBe(0);
    });
  });

  describe('gathering expenses', () => {
    it('POST /gatherings/:id/expenses adds the expense and recomputes the total', async () => {
      const gathering = await createGathering(user.id, { participants: ['Ana', 'Bruno'] });
      const participantId = gathering.participants[0]!.id;

      const res = await request(app)
        .post(`/api/split-expenses/gatherings/${gathering.id}/expenses`)
        .set('Authorization', auth)
        .send({ participantId, amount: 5000, description: 'Carne' });

      expect(res.status).toBe(201);
      expect(res.body.totalAmount).toBe(5000);
      expect(res.body.expenses).toHaveLength(1);
    });

    it('POST /gatherings/:id/expenses returns 404 for an unknown participant', async () => {
      const gathering = await createGathering(user.id, { participants: ['Ana'] });

      const res = await request(app)
        .post(`/api/split-expenses/gatherings/${gathering.id}/expenses`)
        .set('Authorization', auth)
        .send({ participantId: 'missing-participant', amount: 100 });

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Participante no encontrado en la juntada');
    });

    it('POST /gatherings/:id/expenses returns 409 when the gathering is settled', async () => {
      const gathering = await createGathering(user.id, { participants: ['Ana'], isSettled: true });
      const participantId = gathering.participants[0]!.id;

      const res = await request(app)
        .post(`/api/split-expenses/gatherings/${gathering.id}/expenses`)
        .set('Authorization', auth)
        .send({ participantId, amount: 100 });

      expect(res.status).toBe(409);
      expect(res.body.message).toBe('La juntada está saldada');
    });

    it('DELETE /gatherings/:id/expenses/:expenseId returns 204 and removes the row', async () => {
      const gathering = await createGathering(user.id, { participants: ['Ana'] });
      const participantId = gathering.participants[0]!.id;
      const created = await request(app)
        .post(`/api/split-expenses/gatherings/${gathering.id}/expenses`)
        .set('Authorization', auth)
        .send({ participantId, amount: 300 });
      const expenseId = created.body.expenses[0].id;

      const res = await request(app)
        .delete(`/api/split-expenses/gatherings/${gathering.id}/expenses/${expenseId}`)
        .set('Authorization', auth);

      expect(res.status).toBe(204);
      expect(await prisma.gatheringExpense.count({ where: { gatheringId: gathering.id } })).toBe(0);
    });
  });

  // Regresión: Express 5 reparsea req.query desde un getter, así que validate() tiene que
  // redefinir la propiedad. Sin eso, la coerción de Zod se descarta y Prisma recibe take: "2".
  describe('query coercion reaches Prisma', () => {
    it('GET /gatherings?page=1&limit=2 sends numeric take and skip', async () => {
      await createGathering(user.id, { name: 'Uno' });
      await createGathering(user.id, { name: 'Dos' });
      await createGathering(user.id, { name: 'Tres' });

      const res = await request(app).get('/api/split-expenses/gatherings?page=1&limit=2').set('Authorization', auth);

      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(2);
      expect(res.body.total).toBe(3);
      expect(typeof res.body.page).toBe('number');
      expect(typeof res.body.limit).toBe('number');

      const call = findRecordedCall('gathering', 'findMany');
      expect(call).toBeDefined();
      expect(call?.args?.take).toBe(2);
      expect(typeof call?.args?.take).toBe('number');
      expect(call?.args?.skip).toBe(0);
      expect(typeof call?.args?.skip).toBe('number');
    });

    it('GET /gatherings?page=2&limit=2 skips the first page', async () => {
      await createGathering(user.id, { name: 'Uno' });
      await createGathering(user.id, { name: 'Dos' });
      await createGathering(user.id, { name: 'Tres' });

      const res = await request(app).get('/api/split-expenses/gatherings?page=2&limit=2').set('Authorization', auth);

      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(1);

      const call = findRecordedCall('gathering', 'findMany');
      expect(call?.args?.skip).toBe(2);
      expect(call?.args?.take).toBe(2);
    });

    it('GET /gatherings rejects a non-numeric limit', async () => {
      const res = await request(app).get('/api/split-expenses/gatherings?limit=abc').set('Authorization', auth);

      expect(res.status).toBe(400);
    });
  });

  describe('test isolation', () => {
    it('does not see rows written by previous tests', async () => {
      expect(await prisma.gathering.count()).toBe(0);
      expect(await prisma.splitFriend.count()).toBe(0);
    });

    it('withSavepoint recovers from a database-level error', async () => {
      const friend = await createFriend(user.id, { name: 'Ana' });

      await expect(
        withSavepoint(async () => {
          await prisma.splitFriend.create({
            data: { id: 'dup', userId: user.id, name: 'Ana', nameNormalized: friend.nameNormalized },
          });
        })
      ).rejects.toThrow();

      // La transacción sigue usable, que es justamente el punto del savepoint.
      expect(await prisma.splitFriend.count({ where: { userId: user.id } })).toBe(1);
    });
  });
});
