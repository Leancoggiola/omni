import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';

import { prisma } from '../../common/db';
import { authHeader } from '../../test/integration/auth';
import { createIntegrationApp } from '../../test/integration/createIntegrationApp';
import {
  createFriend,
  createGathering,
  createGatheringExpense,
  createUser,
  toJwtUser,
} from '../../test/integration/factories';
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

    it('GET /gatherings sums each gathering in the database and rounds the total', async () => {
      const asado = await createGathering(user.id, { name: 'Asado', participants: ['Ana', 'Beto'] });
      await createGatheringExpense(asado.id, asado.participants[0]!.id, { amount: 0.1 });
      await createGatheringExpense(asado.id, asado.participants[1]!.id, { amount: 0.2 });
      await createGathering(user.id, { name: 'Vacía', participants: ['Ana'] });

      const res = await request(app).get('/api/split-expenses/gatherings').set('Authorization', auth);

      const byName = Object.fromEntries(
        res.body.items.map((item: { name: string; totalAmount: number; participantCount: number }) => [item.name, item])
      );
      expect(byName.Asado).toMatchObject({ totalAmount: 0.3, participantCount: 2 });
      expect(byName['Vacía']).toMatchObject({ totalAmount: 0, participantCount: 1 });
    });

    it('GET /gatherings/:id rounds the totals and the fair share', async () => {
      const asado = await createGathering(user.id, { name: 'Asado', participants: ['Ana', 'Beto'] });
      await createGatheringExpense(asado.id, asado.participants[0]!.id, { amount: 0.1 });
      await createGatheringExpense(asado.id, asado.participants[0]!.id, { amount: 0.2 });

      const res = await request(app).get(`/api/split-expenses/gatherings/${asado.id}`).set('Authorization', auth);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ totalAmount: 0.3, fairShare: 0.15 });
      expect(res.body.participants.find((p: { displayName: string }) => p.displayName === 'Ana').totalPaid).toBe(0.3);
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
      expect(stored[0]?.participants).toHaveLength(3);
      expect(stored[0]?.participants.map(p => p.displayName).sort()).toEqual(['Ana', 'Bruno', 'Test User']);
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

  describe('participante propio ("Vos")', () => {
    it('POST /gatherings agrega al usuario como primer participante con su nombre y isSelf', async () => {
      const res = await request(app)
        .post('/api/split-expenses/gatherings')
        .set('Authorization', auth)
        .send({ name: 'Asado', date: '2026-08-10', participants: [{ name: 'Ana' }, { name: 'Bruno' }] });

      expect(res.status).toBe(201);
      expect(res.body.participantCount).toBe(3);
      expect(res.body.participants[0]).toMatchObject({
        displayName: 'Test User',
        friendId: null,
        alias: null,
        isSelf: true,
        totalPaid: 0,
        balance: 0,
      });
      expect(
        res.body.participants.slice(1).map((p: { displayName: string; isSelf: boolean }) => [p.displayName, p.isSelf])
      ).toEqual(
        expect.arrayContaining([
          ['Ana', false],
          ['Bruno', false],
        ])
      );
      expect(res.body.myBalance).toBe(0);

      const stored = await prisma.gatheringParticipant.findMany({ where: { gathering: { userId: user.id } } });
      expect(stored.filter(p => p.isSelf)).toHaveLength(1);
    });

    it('POST /gatherings usa el nombre del usuario sin espacios sobrantes', async () => {
      const spaced = await createUser({ username: 'spaced-owner', name: '  Lean Coggiola  ' });

      const res = await request(app)
        .post('/api/split-expenses/gatherings')
        .set('Authorization', authHeader(toJwtUser(spaced)))
        .send({ name: 'Asado', date: '2026-08-10', participants: [{ name: 'Ana' }] });

      expect(res.status).toBe(201);
      expect(res.body.participants[0]).toMatchObject({ displayName: 'Lean Coggiola', isSelf: true });
    });

    it('POST /gatherings suma al usuario también cuando los participantes son amigos', async () => {
      const friend = await createFriend(user.id, { name: 'Ana', alias: 'ana123' });

      const res = await request(app)
        .post('/api/split-expenses/gatherings')
        .set('Authorization', auth)
        .send({ name: 'Cena', date: '2026-08-10', participants: [{ friendId: friend.id }] });

      expect(res.status).toBe(201);
      expect(res.body.participants).toHaveLength(2);
      expect(res.body.participants[0]).toMatchObject({ displayName: 'Test User', isSelf: true, friendId: null });
      expect(res.body.participants[1]).toMatchObject({ displayName: 'Ana', isSelf: false, friendId: friend.id });
    });

    it('POST /gatherings devuelve 409 si un participante usa el nombre del usuario', async () => {
      const res = await request(app)
        .post('/api/split-expenses/gatherings')
        .set('Authorization', auth)
        .send({ name: 'Asado', date: '2026-08-10', participants: [{ name: 'test user' }, { name: 'Ana' }] });

      expect(res.status).toBe(409);
      expect(res.body.message).toBe('Ya participás en la juntada: no hace falta agregarte');
      expect(await prisma.gathering.count({ where: { userId: user.id } })).toBe(0);
    });

    it('la base rechaza un segundo participante propio en la misma juntada', async () => {
      const gathering = await createGathering(user.id, { selfName: 'Vos', participants: ['Ana'] });

      await expect(
        withSavepoint(async () => {
          await prisma.gatheringParticipant.create({
            data: { gatheringId: gathering.id, displayName: 'Otro yo', isSelf: true },
          });
        })
      ).rejects.toThrow();

      expect(await prisma.gatheringParticipant.count({ where: { gatheringId: gathering.id, isSelf: true } })).toBe(1);
    });

    it('la base permite un participante propio por juntada en juntadas distintas', async () => {
      await createGathering(user.id, { selfName: 'Vos', participants: ['Ana'] });
      await createGathering(user.id, { selfName: 'Vos', participants: ['Ana'] });

      expect(await prisma.gatheringParticipant.count({ where: { isSelf: true } })).toBe(2);
    });
  });

  describe('saldos por juntada', () => {
    it('GET /gatherings/:id devuelve el balance de cada participante y myBalance', async () => {
      const gathering = await createGathering(user.id, {
        selfName: 'Test User',
        participants: ['Ana', 'Bruno'],
      });
      const [self, ana] = gathering.participants;
      await createGatheringExpense(gathering.id, self!.id, { amount: 9000 });
      await createGatheringExpense(gathering.id, ana!.id, { amount: 3000 });

      const res = await request(app).get(`/api/split-expenses/gatherings/${gathering.id}`).set('Authorization', auth);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ totalAmount: 12000, fairShare: 4000, myBalance: 5000 });
      const byName = Object.fromEntries(res.body.participants.map((p: { displayName: string }) => [p.displayName, p]));
      expect(byName['Test User']).toMatchObject({ isSelf: true, totalPaid: 9000, balance: 5000 });
      expect(byName.Ana).toMatchObject({ isSelf: false, totalPaid: 3000, balance: -1000 });
      expect(byName.Bruno).toMatchObject({ isSelf: false, totalPaid: 0, balance: -4000 });
    });

    it('GET /gatherings/:id devuelve myBalance negativo cuando el usuario debe', async () => {
      const gathering = await createGathering(user.id, { selfName: 'Test User', participants: ['Ana'] });
      await createGatheringExpense(gathering.id, gathering.participants[1]!.id, { amount: 1000 });

      const res = await request(app).get(`/api/split-expenses/gatherings/${gathering.id}`).set('Authorization', auth);

      expect(res.body.myBalance).toBe(-500);
    });

    it('GET /gatherings/:id redondea balance y myBalance a centavos', async () => {
      const gathering = await createGathering(user.id, {
        selfName: 'Test User',
        participants: ['Ana', 'Bruno'],
      });
      await createGatheringExpense(gathering.id, gathering.participants[0]!.id, { amount: 100 });

      const res = await request(app).get(`/api/split-expenses/gatherings/${gathering.id}`).set('Authorization', auth);

      expect(res.body.fairShare).toBe(33.33);
      expect(res.body.myBalance).toBe(66.67);
    });

    it('GET /gatherings/:id de una juntada vieja sin participante propio devuelve myBalance null', async () => {
      const gathering = await createGathering(user.id, { participants: ['Ana', 'Bruno'] });
      await createGatheringExpense(gathering.id, gathering.participants[0]!.id, { amount: 600 });

      const res = await request(app).get(`/api/split-expenses/gatherings/${gathering.id}`).set('Authorization', auth);

      expect(res.status).toBe(200);
      expect(res.body.myBalance).toBeNull();
      expect(res.body.participants.every((p: { isSelf: boolean }) => !p.isSelf)).toBe(true);
      const ana = res.body.participants.find((p: { displayName: string }) => p.displayName === 'Ana');
      expect(ana).toMatchObject({ totalPaid: 600, balance: 300 });
    });

    it('POST /gatherings/:id/expenses actualiza balance y myBalance', async () => {
      const created = await request(app)
        .post('/api/split-expenses/gatherings')
        .set('Authorization', auth)
        .send({ name: 'Asado', date: '2026-08-10', participants: [{ name: 'Ana' }] });
      const self = created.body.participants.find((p: { isSelf: boolean }) => p.isSelf);

      const res = await request(app)
        .post(`/api/split-expenses/gatherings/${created.body.id}/expenses`)
        .set('Authorization', auth)
        .send({ participantId: self.id, amount: 8000 });

      expect(res.status).toBe(201);
      expect(res.body.myBalance).toBe(4000);
      expect(res.body.participants.find((p: { isSelf: boolean }) => p.isSelf).balance).toBe(4000);
      expect(res.body.settlements).toHaveLength(1);
    });

    it('GET /gatherings devuelve myBalance de cada juntada, null en las viejas', async () => {
      const nueva = await createGathering(user.id, { name: 'Nueva', selfName: 'Test User', participants: ['Ana'] });
      await createGatheringExpense(nueva.id, nueva.participants[0]!.id, { amount: 1000 });
      const vieja = await createGathering(user.id, { name: 'Vieja', participants: ['Ana', 'Beto'] });
      await createGatheringExpense(vieja.id, vieja.participants[0]!.id, { amount: 300 });
      const saldada = await createGathering(user.id, {
        name: 'Saldada',
        selfName: 'Test User',
        participants: ['Ana'],
        isSettled: true,
      });
      await createGatheringExpense(saldada.id, saldada.participants[1]!.id, { amount: 200 });

      const res = await request(app).get('/api/split-expenses/gatherings').set('Authorization', auth);

      expect(res.status).toBe(200);
      const byName = Object.fromEntries(res.body.items.map((item: { name: string }) => [item.name, item]));
      expect(byName.Nueva).toMatchObject({ participantCount: 2, totalAmount: 1000, myBalance: 500 });
      expect(byName.Vieja).toMatchObject({ participantCount: 2, totalAmount: 300, myBalance: null });
      expect(byName.Saldada).toMatchObject({ isSettled: true, totalAmount: 200, myBalance: -100 });
    });
  });

  describe('GET /balance', () => {
    it('devuelve 401 sin autenticación', async () => {
      const res = await request(app).get('/api/split-expenses/balance');
      expect(res.status).toBe(401);
    });

    it('sin juntadas devuelve todo en cero', async () => {
      const res = await request(app).get('/api/split-expenses/balance').set('Authorization', auth);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ owedToYou: 0, youOwe: 0, net: 0, gatheringCount: 0 });
    });

    it('suma lo que te deben y lo que debés solo en juntadas activas con participante propio', async () => {
      const aFavor = await createGathering(user.id, { selfName: 'Test User', participants: ['Ana', 'Bruno'] });
      await createGatheringExpense(aFavor.id, aFavor.participants[0]!.id, { amount: 9000 });

      const enContra = await createGathering(user.id, { selfName: 'Test User', participants: ['Ana'] });
      await createGatheringExpense(enContra.id, enContra.participants[1]!.id, { amount: 3000 });

      const saldada = await createGathering(user.id, {
        selfName: 'Test User',
        participants: ['Ana'],
        isSettled: true,
      });
      await createGatheringExpense(saldada.id, saldada.participants[0]!.id, { amount: 50000 });

      const vieja = await createGathering(user.id, { participants: ['Ana', 'Bruno'] });
      await createGatheringExpense(vieja.id, vieja.participants[0]!.id, { amount: 70000 });

      const other = await createUser({ username: 'other-owner' });
      const ajena = await createGathering(other.id, { selfName: 'Test User', participants: ['Ana'] });
      await createGatheringExpense(ajena.id, ajena.participants[0]!.id, { amount: 90000 });

      const res = await request(app).get('/api/split-expenses/balance').set('Authorization', auth);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ owedToYou: 6000, youOwe: 1500, net: 4500, gatheringCount: 2 });
    });

    it('cuenta las juntadas activas que están en cero sin sumar importes', async () => {
      await createGathering(user.id, { selfName: 'Test User', participants: ['Ana'] });

      const res = await request(app).get('/api/split-expenses/balance').set('Authorization', auth);

      expect(res.body).toEqual({ owedToYou: 0, youOwe: 0, net: 0, gatheringCount: 1 });
    });

    it('con solo juntadas viejas queda en cero y no las cuenta', async () => {
      const vieja = await createGathering(user.id, { participants: ['Ana', 'Bruno'] });
      await createGatheringExpense(vieja.id, vieja.participants[0]!.id, { amount: 700 });

      const res = await request(app).get('/api/split-expenses/balance').set('Authorization', auth);

      expect(res.body).toEqual({ owedToYou: 0, youOwe: 0, net: 0, gatheringCount: 0 });
    });

    it('redondea las sumas a centavos', async () => {
      const first = await createGathering(user.id, { selfName: 'Test User', participants: ['Ana'] });
      await createGatheringExpense(first.id, first.participants[0]!.id, { amount: 0.2 });
      const second = await createGathering(user.id, { selfName: 'Test User', participants: ['Ana'] });
      await createGatheringExpense(second.id, second.participants[0]!.id, { amount: 0.4 });

      const res = await request(app).get('/api/split-expenses/balance').set('Authorization', auth);

      expect(res.body).toEqual({ owedToYou: 0.3, youOwe: 0, net: 0.3, gatheringCount: 2 });
    });

    it('refleja gastos nuevos y saldar la juntada de punta a punta', async () => {
      const created = await request(app)
        .post('/api/split-expenses/gatherings')
        .set('Authorization', auth)
        .send({ name: 'Asado', date: '2026-08-10', participants: [{ name: 'Ana' }, { name: 'Bruno' }] });
      const self = created.body.participants.find((p: { isSelf: boolean }) => p.isSelf);

      const expense = await request(app)
        .post(`/api/split-expenses/gatherings/${created.body.id}/expenses`)
        .set('Authorization', auth)
        .send({ participantId: self.id, amount: 9000 });
      expect(expense.status).toBe(201);

      const active = await request(app).get('/api/split-expenses/balance').set('Authorization', auth);
      expect(active.body).toEqual({ owedToYou: 6000, youOwe: 0, net: 6000, gatheringCount: 1 });

      await request(app)
        .patch(`/api/split-expenses/gatherings/${created.body.id}/settled`)
        .set('Authorization', auth)
        .send({ isSettled: true });

      const settled = await request(app).get('/api/split-expenses/balance').set('Authorization', auth);
      expect(settled.body).toEqual({ owedToYou: 0, youOwe: 0, net: 0, gatheringCount: 0 });
    });
  });

  describe('saldo por amigo', () => {
    async function createGatheringWith(friendIds: string[], name = 'Juntada') {
      const res = await request(app)
        .post('/api/split-expenses/gatherings')
        .set('Authorization', auth)
        .send({ name, date: '2026-08-10', participants: friendIds.map(friendId => ({ friendId })) });
      return res.body as { id: string; participants: Array<{ id: string; friendId: string | null; isSelf: boolean }> };
    }

    async function pay(gatheringId: string, participantId: string, amount: number) {
      await request(app)
        .post(`/api/split-expenses/gatherings/${gatheringId}/expenses`)
        .set('Authorization', auth)
        .send({ participantId, amount });
    }

    it('GET /friends suma el balance de cada amigo en las juntadas activas', async () => {
      const ana = await createFriend(user.id, { name: 'Ana' });
      const bruno = await createFriend(user.id, { name: 'Bruno' });
      await createFriend(user.id, { name: 'Carla' });

      const cena = await createGatheringWith([ana.id, bruno.id], 'Cena');
      await pay(cena.id, cena.participants.find(p => p.friendId === ana.id)!.id, 9000);

      const cafe = await createGatheringWith([ana.id], 'Café');
      await pay(cafe.id, cafe.participants.find(p => p.isSelf)!.id, 2000);

      const res = await request(app).get('/api/split-expenses/friends').set('Authorization', auth);

      expect(res.status).toBe(200);
      const byName = Object.fromEntries(res.body.map((f: { name: string }) => [f.name, f]));
      expect(byName.Ana).toMatchObject({ id: ana.id, balance: 5000 });
      expect(byName.Bruno).toMatchObject({ id: bruno.id, balance: -3000 });
      expect(byName.Carla.balance).toBe(0);
    });

    it('GET /friends ignora las juntadas saldadas', async () => {
      const ana = await createFriend(user.id, { name: 'Ana' });
      const activa = await createGatheringWith([ana.id], 'Activa');
      await pay(activa.id, activa.participants.find(p => p.friendId === ana.id)!.id, 1000);
      const saldada = await createGatheringWith([ana.id], 'Saldada');
      await pay(saldada.id, saldada.participants.find(p => p.friendId === ana.id)!.id, 4000);
      await request(app)
        .patch(`/api/split-expenses/gatherings/${saldada.id}/settled`)
        .set('Authorization', auth)
        .send({ isSettled: true });

      const res = await request(app).get('/api/split-expenses/friends').set('Authorization', auth);

      expect(res.body[0]).toMatchObject({ name: 'Ana', balance: 500 });
    });

    it('GET /friends no mezcla los saldos de amigos de otros usuarios', async () => {
      const ana = await createFriend(user.id, { name: 'Ana' });
      const other = await createUser({ username: 'other-owner' });
      const otherAna = await createFriend(other.id, { name: 'Ana' });
      const ajena = await createGathering(other.id, { selfName: 'Test User', participants: ['Beto'] });
      await prisma.gatheringParticipant.create({
        data: { gatheringId: ajena.id, displayName: 'Ana', friendId: otherAna.id },
      });
      await createGatheringExpense(ajena.id, ajena.participants[1]!.id, { amount: 6000 });

      const res = await request(app).get('/api/split-expenses/friends').set('Authorization', auth);

      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toMatchObject({ id: ana.id, balance: 0 });
    });

    it('GET /friends redondea el balance acumulado a centavos', async () => {
      const ana = await createFriend(user.id, { name: 'Ana' });
      const first = await createGatheringWith([ana.id], 'Uno');
      await pay(first.id, first.participants.find(p => p.friendId === ana.id)!.id, 0.1);
      const second = await createGatheringWith([ana.id], 'Dos');
      await pay(second.id, second.participants.find(p => p.friendId === ana.id)!.id, 0.2);

      const res = await request(app).get('/api/split-expenses/friends').set('Authorization', auth);

      expect(res.body[0].balance).toBe(0.15);
    });

    it('GET /friends sigue devolviendo los datos del amigo', async () => {
      await createFriend(user.id, { name: 'Ana', alias: 'ana123' });

      const res = await request(app).get('/api/split-expenses/friends').set('Authorization', auth);

      expect(res.body[0]).toMatchObject({ name: 'Ana', alias: 'ana123', balance: 0 });
      expect(res.body[0].createdAt).toEqual(expect.any(String));
    });
  });

  /**
   * Regresión: Express 5 reparsea req.query desde un getter, así que validate() tiene que redefinir la
   * propiedad. Sin eso, la coerción de Zod se descarta y Prisma recibe take: "2".
   */
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

      expect(await prisma.splitFriend.count({ where: { userId: user.id } })).toBe(1);
    });
  });
});
