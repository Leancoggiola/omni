import { beforeEach, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import request from 'supertest';

import { prisma } from '../../common/db';
import { basePrisma, clearPrismaOverride } from '../../common/db/prisma';
import { authHeader } from '../../test/integration/auth';
import { createIntegrationApp } from '../../test/integration/createIntegrationApp';
import { createGymExercise, createGymPlan, createUser, toJwtUser } from '../../test/integration/factories';
import { findRecordedCall, resetRecordedCalls } from '../../test/integration/queryRecorder';
import { withSavepoint } from '../../test/integration/withSavepoint';

const app = await createIntegrationApp();

describe('gym routes (integration)', () => {
  let user: Awaited<ReturnType<typeof createUser>>;
  let auth: string;

  beforeEach(async () => {
    user = await createUser({ username: 'gym-owner' });
    auth = authHeader(toJwtUser(user));
  });

  async function otherUserPlan(options: Parameters<typeof createGymPlan>[1] = {}) {
    const other = await createUser({ username: 'gym-other' });
    return createGymPlan(other.id, options);
  }

  describe('auth', () => {
    it('returns 401 without auth on GET /plans', async () => {
      const res = await request(app).get('/api/gym/plans');
      expect(res.status).toBe(401);
    });

    it.each([
      ['PATCH', '/api/gym/plans/p1'],
      ['DELETE', '/api/gym/plans/p1'],
      ['POST', '/api/gym/plans/p1/unarchive'],
      ['PATCH', '/api/gym/days/d1'],
      ['DELETE', '/api/gym/days/d1'],
      ['PUT', '/api/gym/days/d1/exercises/order'],
      ['GET', '/api/gym/exercises/e1/weight-history'],
      ['GET', '/api/gym/exercises/catalog'],
      ['GET', '/api/gym/exercises/catalog/c1/weight-history'],
    ] as const)('returns 401 without auth on %s %s', async (method, path) => {
      const res = await request(app)[method.toLowerCase() as 'get'](path);
      expect(res.status).toBe(401);
    });
  });

  describe('plans', () => {
    it('GET /plans returns a paginated list scoped to the user', async () => {
      await createGymPlan(user.id, { name: 'Fuerza' });
      await otherUserPlan({ name: 'Ajeno' });

      const res = await request(app).get('/api/gym/plans').set('Authorization', auth);

      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(1);
      expect(res.body).toMatchObject({ total: 1, page: 1, limit: 50 });
    });

    it('GET /plans sends numeric take and skip to Prisma', async () => {
      await createGymPlan(user.id);
      await createGymPlan(user.id);
      await createGymPlan(user.id);

      const res = await request(app).get('/api/gym/plans?page=2&limit=2').set('Authorization', auth);

      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(1);
      const call = findRecordedCall('gymPlan', 'findMany');
      expect(call?.args?.take).toBe(2);
      expect(call?.args?.skip).toBe(2);
    });

    it('GET /plans counts the days and the exercises of each plan', async () => {
      const plan = await createGymPlan(user.id, { name: 'Fuerza' });
      await createGymExercise(plan.id, { weekday: 'MONDAY', name: 'Sentadilla' });
      await createGymExercise(plan.id, { weekday: 'MONDAY', name: 'Prensa' });
      await createGymExercise(plan.id, { weekday: 'FRIDAY', name: 'Remo' });

      const res = await request(app).get('/api/gym/plans').set('Authorization', auth);

      expect(res.body.items[0]).toMatchObject({ name: 'Fuerza', dayCount: 2, exerciseCount: 3 });
    });

    it('GET /plans/:planId returns the plan detail', async () => {
      const plan = await createGymPlan(user.id, { name: 'Fuerza' });
      await createGymExercise(plan.id, { weekday: 'MONDAY', name: 'Sentadilla' });

      const res = await request(app).get(`/api/gym/plans/${plan.id}`).set('Authorization', auth);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ id: plan.id, name: 'Fuerza', status: 'ACTIVE' });
      expect(res.body.days).toHaveLength(1);
      expect(res.body.days[0]).toEqual({ id: expect.any(String), weekday: 'MONDAY', exercises: expect.any(Array) });
      expect(res.body.days[0].exercises[0]).toMatchObject({ name: 'Sentadilla', catalogId: expect.any(String) });
    });

    it('GET /plans/:planId orders the days from Monday to Sunday, whatever the creation order', async () => {
      const plan = await createGymPlan(user.id);
      await createGymExercise(plan.id, { weekday: 'SUNDAY' });
      await createGymExercise(plan.id, { weekday: 'WEDNESDAY' });
      await createGymExercise(plan.id, { weekday: 'MONDAY' });

      const res = await request(app).get(`/api/gym/plans/${plan.id}`).set('Authorization', auth);

      expect(res.body.days.map((day: { weekday: string }) => day.weekday)).toEqual(['MONDAY', 'WEDNESDAY', 'SUNDAY']);
    });

    it('GET /plans/:planId returns 404 for an unknown plan', async () => {
      const res = await request(app).get('/api/gym/plans/missing').set('Authorization', auth);
      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Plan no encontrado');
    });

    it('GET /plans/:planId returns 404 when the plan belongs to another user', async () => {
      const plan = await otherUserPlan();

      const res = await request(app).get(`/api/gym/plans/${plan.id}`).set('Authorization', auth);

      expect(res.status).toBe(404);
    });

    it('POST /plans persists the plan', async () => {
      const res = await request(app).post('/api/gym/plans').set('Authorization', auth).send({ name: 'Nuevo plan' });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ name: 'Nuevo plan', status: 'ACTIVE', days: [] });
      expect(await prisma.gymPlan.count({ where: { userId: user.id } })).toBe(1);
    });

    it('POST /plans rejects an invalid body', async () => {
      const res = await request(app).post('/api/gym/plans').set('Authorization', auth).send({ name: '' });

      expect(res.status).toBe(400);
      expect(await prisma.gymPlan.count({ where: { userId: user.id } })).toBe(0);
    });

    it('POST /plans requires a name', async () => {
      const res = await request(app).post('/api/gym/plans').set('Authorization', auth).send({});

      expect(res.status).toBe(400);
      expect(res.body.errors).toHaveProperty('name');
      expect(await prisma.gymPlan.count({ where: { userId: user.id } })).toBe(0);
    });

    describe('archive', () => {
      it('POST /plans/:planId/archive archives the plan', async () => {
        const plan = await createGymPlan(user.id);

        const res = await request(app).post(`/api/gym/plans/${plan.id}/archive`).set('Authorization', auth);

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('ARCHIVED');
        const stored = await prisma.gymPlan.findUnique({ where: { id: plan.id } });
        expect(stored?.status).toBe('ARCHIVED');
        expect(stored?.archivedAt).not.toBeNull();
      });

      it('POST /plans/:planId/archive on an archived plan returns 200 and keeps the original archivedAt', async () => {
        const plan = await createGymPlan(user.id, { status: 'ARCHIVED' });

        const res = await request(app).post(`/api/gym/plans/${plan.id}/archive`).set('Authorization', auth);

        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ status: 'ARCHIVED', archivedAt: '2026-02-01T00:00:00.000Z' });
        const stored = await prisma.gymPlan.findUnique({ where: { id: plan.id } });
        expect(stored?.archivedAt?.toISOString()).toBe('2026-02-01T00:00:00.000Z');
      });

      it('POST /plans/:planId/archive returns 404 for a plan of another user and leaves it active', async () => {
        const plan = await otherUserPlan();

        const res = await request(app).post(`/api/gym/plans/${plan.id}/archive`).set('Authorization', auth);

        expect(res.status).toBe(404);
        expect((await prisma.gymPlan.findUnique({ where: { id: plan.id } }))?.status).toBe('ACTIVE');
      });

      it('POST /plans/:planId/unarchive reactivates the plan and clears archivedAt', async () => {
        const plan = await createGymPlan(user.id, { status: 'ARCHIVED' });

        const res = await request(app).post(`/api/gym/plans/${plan.id}/unarchive`).set('Authorization', auth);

        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ status: 'ACTIVE', archivedAt: null });
        const stored = await prisma.gymPlan.findUnique({ where: { id: plan.id } });
        expect(stored).toMatchObject({ status: 'ACTIVE', archivedAt: null });
      });

      it('POST /plans/:planId/unarchive on an active plan returns 200 unchanged', async () => {
        const plan = await createGymPlan(user.id, { name: 'Fuerza' });

        const res = await request(app).post(`/api/gym/plans/${plan.id}/unarchive`).set('Authorization', auth);

        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ name: 'Fuerza', status: 'ACTIVE', archivedAt: null });
      });

      it('POST /plans/:planId/unarchive returns 404 for a plan of another user and leaves it archived', async () => {
        const plan = await otherUserPlan({ status: 'ARCHIVED' });

        const res = await request(app).post(`/api/gym/plans/${plan.id}/unarchive`).set('Authorization', auth);

        expect(res.status).toBe(404);
        expect((await prisma.gymPlan.findUnique({ where: { id: plan.id } }))?.status).toBe('ARCHIVED');
      });

      it('an unarchived plan can be edited again', async () => {
        const plan = await createGymPlan(user.id, { status: 'ARCHIVED' });
        await request(app).post(`/api/gym/plans/${plan.id}/unarchive`).set('Authorization', auth);

        const res = await request(app)
          .post('/api/gym/exercises')
          .set('Authorization', auth)
          .send({ planId: plan.id, weekday: 'MONDAY', name: 'Sentadilla', reps: '6' });

        expect(res.status).toBe(201);
      });
    });

    describe('rename', () => {
      it('PATCH /plans/:planId renames the plan', async () => {
        const plan = await createGymPlan(user.id, { name: 'Fuerza' });

        const res = await request(app)
          .patch(`/api/gym/plans/${plan.id}`)
          .set('Authorization', auth)
          .send({ name: '  Hipertrofia  ' });

        expect(res.status).toBe(200);
        expect(res.body.name).toBe('Hipertrofia');
        expect((await prisma.gymPlan.findUnique({ where: { id: plan.id } }))?.name).toBe('Hipertrofia');
      });

      it('PATCH /plans/:planId returns 409 when the plan is archived and keeps the name', async () => {
        const plan = await createGymPlan(user.id, { name: 'Fuerza', status: 'ARCHIVED' });

        const res = await request(app)
          .patch(`/api/gym/plans/${plan.id}`)
          .set('Authorization', auth)
          .send({ name: 'Otro' });

        expect(res.status).toBe(409);
        expect(res.body.message).toBe('El plan está archivado');
        expect((await prisma.gymPlan.findUnique({ where: { id: plan.id } }))?.name).toBe('Fuerza');
      });

      it('PATCH /plans/:planId rejects an empty or null name', async () => {
        const plan = await createGymPlan(user.id, { name: 'Fuerza' });

        const empty = await request(app)
          .patch(`/api/gym/plans/${plan.id}`)
          .set('Authorization', auth)
          .send({ name: '' });
        const nullName = await request(app)
          .patch(`/api/gym/plans/${plan.id}`)
          .set('Authorization', auth)
          .send({ name: null });

        expect(empty.status).toBe(400);
        expect(nullName.status).toBe(400);
        expect((await prisma.gymPlan.findUnique({ where: { id: plan.id } }))?.name).toBe('Fuerza');
      });

      it('PATCH /plans/:planId returns 404 for a plan of another user', async () => {
        const plan = await otherUserPlan({ name: 'Ajeno' });

        const res = await request(app)
          .patch(`/api/gym/plans/${plan.id}`)
          .set('Authorization', auth)
          .send({ name: 'Mío' });

        expect(res.status).toBe(404);
        expect((await prisma.gymPlan.findUnique({ where: { id: plan.id } }))?.name).toBe('Ajeno');
      });
    });

    describe('delete', () => {
      it('DELETE /plans/:planId removes the plan, its days and exercises', async () => {
        const plan = await createGymPlan(user.id);
        const exercise = await createGymExercise(plan.id, { weekday: 'MONDAY' });

        const res = await request(app).delete(`/api/gym/plans/${plan.id}`).set('Authorization', auth);

        expect(res.status).toBe(204);
        expect(await prisma.gymPlan.findUnique({ where: { id: plan.id } })).toBeNull();
        expect(await prisma.gymPlanDay.count({ where: { planId: plan.id } })).toBe(0);
        expect(await prisma.gymPlanExercise.findUnique({ where: { id: exercise.id } })).toBeNull();
      });

      it('DELETE /plans/:planId removes the catalog variants only that plan used, with their history', async () => {
        const plan = await createGymPlan(user.id);
        const exercise = await createGymExercise(plan.id, { name: 'Sentadilla', currentWeightKg: 80 });
        await prisma.gymExerciseWeightEntry.create({
          data: { exerciseId: exercise.exerciseId, weightKg: 80, sets: 4, reps: '6' },
        });

        await request(app).delete(`/api/gym/plans/${plan.id}`).set('Authorization', auth);

        expect(await prisma.gymExercise.findUnique({ where: { id: exercise.exerciseId } })).toBeNull();
        expect(await prisma.gymExerciseWeightEntry.count({ where: { exerciseId: exercise.exerciseId } })).toBe(0);
      });

      it('DELETE /plans/:planId keeps the catalog variants another plan still uses', async () => {
        const deleted = await createGymPlan(user.id);
        const kept = await createGymPlan(user.id, { status: 'ARCHIVED' });
        const exercise = await createGymExercise(deleted.id, { name: 'Sentadilla' });
        await createGymExercise(kept.id, { name: 'Sentadilla' });

        await request(app).delete(`/api/gym/plans/${deleted.id}`).set('Authorization', auth);

        expect(await prisma.gymExercise.findUnique({ where: { id: exercise.exerciseId } })).not.toBeNull();
      });

      it('DELETE /plans/:planId also deletes an archived plan', async () => {
        const plan = await createGymPlan(user.id, { status: 'ARCHIVED' });

        const res = await request(app).delete(`/api/gym/plans/${plan.id}`).set('Authorization', auth);

        expect(res.status).toBe(204);
        expect(await prisma.gymPlan.findUnique({ where: { id: plan.id } })).toBeNull();
      });

      it('DELETE /plans/:planId returns 404 for a plan of another user and keeps it', async () => {
        const plan = await otherUserPlan();

        const res = await request(app).delete(`/api/gym/plans/${plan.id}`).set('Authorization', auth);

        expect(res.status).toBe(404);
        expect(await prisma.gymPlan.findUnique({ where: { id: plan.id } })).not.toBeNull();
      });
    });
  });

  describe('days', () => {
    it('PATCH /days/:dayId moves the day to another weekday', async () => {
      const plan = await createGymPlan(user.id);
      const exercise = await createGymExercise(plan.id, { weekday: 'MONDAY' });

      const res = await request(app)
        .patch(`/api/gym/days/${exercise.dayId}`)
        .set('Authorization', auth)
        .send({ weekday: 'THURSDAY' });

      expect(res.status).toBe(200);
      expect(res.body.days).toEqual([
        { id: exercise.dayId, weekday: 'THURSDAY', exercises: [expect.objectContaining({ id: exercise.id })] },
      ]);
      expect((await prisma.gymPlanDay.findUnique({ where: { id: exercise.dayId } }))?.weekday).toBe('THURSDAY');
    });

    it('PATCH /days/:dayId returns 409 when the plan already has that weekday and changes nothing', async () => {
      const plan = await createGymPlan(user.id);
      const monday = await createGymExercise(plan.id, { weekday: 'MONDAY' });
      await createGymExercise(plan.id, { weekday: 'WEDNESDAY' });

      const res = await request(app)
        .patch(`/api/gym/days/${monday.dayId}`)
        .set('Authorization', auth)
        .send({ weekday: 'WEDNESDAY' });

      expect(res.status).toBe(409);
      expect(res.body.message).toBe('El plan ya tiene ese día');
      expect((await prisma.gymPlanDay.findUnique({ where: { id: monday.dayId } }))?.weekday).toBe('MONDAY');
    });

    it('PATCH /days/:dayId with the same weekday returns 200 unchanged', async () => {
      const plan = await createGymPlan(user.id);
      const exercise = await createGymExercise(plan.id, { weekday: 'MONDAY' });

      const res = await request(app)
        .patch(`/api/gym/days/${exercise.dayId}`)
        .set('Authorization', auth)
        .send({ weekday: 'MONDAY' });

      expect(res.status).toBe(200);
      expect(res.body.days[0].weekday).toBe('MONDAY');
    });

    it('PATCH /days/:dayId rejects an unknown weekday', async () => {
      const plan = await createGymPlan(user.id);
      const exercise = await createGymExercise(plan.id);

      const res = await request(app)
        .patch(`/api/gym/days/${exercise.dayId}`)
        .set('Authorization', auth)
        .send({ weekday: 'Lunes' });

      expect(res.status).toBe(400);
    });

    it('PATCH /days/:dayId returns 409 when the plan is archived', async () => {
      const plan = await createGymPlan(user.id, { status: 'ARCHIVED' });
      const exercise = await createGymExercise(plan.id, { weekday: 'MONDAY' });

      const res = await request(app)
        .patch(`/api/gym/days/${exercise.dayId}`)
        .set('Authorization', auth)
        .send({ weekday: 'FRIDAY' });

      expect(res.status).toBe(409);
      expect(res.body.message).toBe('El plan está archivado');
      expect((await prisma.gymPlanDay.findUnique({ where: { id: exercise.dayId } }))?.weekday).toBe('MONDAY');
    });

    it('PATCH /days/:dayId returns 404 for a day of another user', async () => {
      const plan = await otherUserPlan();
      const exercise = await createGymExercise(plan.id, { weekday: 'MONDAY' });

      const res = await request(app)
        .patch(`/api/gym/days/${exercise.dayId}`)
        .set('Authorization', auth)
        .send({ weekday: 'FRIDAY' });

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Día no encontrado');
    });

    it('DELETE /days/:dayId removes the day with its exercises and keeps the other days', async () => {
      const plan = await createGymPlan(user.id);
      const monday = await createGymExercise(plan.id, { weekday: 'MONDAY', name: 'Sentadilla' });
      await createGymExercise(plan.id, { weekday: 'MONDAY', name: 'Prensa' });
      await createGymExercise(plan.id, { weekday: 'FRIDAY', name: 'Remo' });

      const res = await request(app).delete(`/api/gym/days/${monday.dayId}`).set('Authorization', auth);

      expect(res.status).toBe(204);
      expect(await prisma.gymPlanDay.findUnique({ where: { id: monday.dayId } })).toBeNull();
      expect(await prisma.gymPlanExercise.count({ where: { dayId: monday.dayId } })).toBe(0);
      const days = await prisma.gymPlanDay.findMany({ where: { planId: plan.id } });
      expect(days.map(day => day.weekday)).toEqual(['FRIDAY']);
    });

    it('DELETE /days/:dayId removes orphan catalog variants and keeps the ones still in use', async () => {
      const plan = await createGymPlan(user.id);
      const orphan = await createGymExercise(plan.id, { weekday: 'MONDAY', name: 'Prensa' });
      const shared = await createGymExercise(plan.id, { weekday: 'MONDAY', name: 'Sentadilla' });
      await createGymExercise(plan.id, { weekday: 'FRIDAY', name: 'Sentadilla' });

      await request(app).delete(`/api/gym/days/${orphan.dayId}`).set('Authorization', auth);

      expect(await prisma.gymExercise.findUnique({ where: { id: orphan.exerciseId } })).toBeNull();
      expect(await prisma.gymExercise.findUnique({ where: { id: shared.exerciseId } })).not.toBeNull();
    });

    it('DELETE /days/:dayId returns 409 when the plan is archived and keeps the day', async () => {
      const plan = await createGymPlan(user.id, { status: 'ARCHIVED' });
      const exercise = await createGymExercise(plan.id);

      const res = await request(app).delete(`/api/gym/days/${exercise.dayId}`).set('Authorization', auth);

      expect(res.status).toBe(409);
      expect(await prisma.gymPlanDay.findUnique({ where: { id: exercise.dayId } })).not.toBeNull();
    });

    it('DELETE /days/:dayId returns 404 for a day of another user and keeps it', async () => {
      const plan = await otherUserPlan();
      const exercise = await createGymExercise(plan.id);

      const res = await request(app).delete(`/api/gym/days/${exercise.dayId}`).set('Authorization', auth);

      expect(res.status).toBe(404);
      expect(await prisma.gymPlanDay.findUnique({ where: { id: exercise.dayId } })).not.toBeNull();
    });
  });

  describe('reorder', () => {
    async function dayWithThreeExercises(status: 'ACTIVE' | 'ARCHIVED' = 'ACTIVE') {
      const plan = await createGymPlan(user.id, { status });
      const first = await createGymExercise(plan.id, { weekday: 'MONDAY', name: 'Sentadilla' });
      const second = await createGymExercise(plan.id, { weekday: 'MONDAY', name: 'Prensa' });
      const third = await createGymExercise(plan.id, { weekday: 'MONDAY', name: 'Estocadas' });
      return { plan, dayId: first.dayId, ids: [first.id, second.id, third.id] };
    }

    it('PUT /days/:dayId/exercises/order stores the new order and returns the plan', async () => {
      const { dayId, ids } = await dayWithThreeExercises();
      const order = [ids[2], ids[0], ids[1]];

      const res = await request(app)
        .put(`/api/gym/days/${dayId}/exercises/order`)
        .set('Authorization', auth)
        .send({ exerciseIds: order });

      expect(res.status).toBe(200);
      expect(res.body.days[0].exercises.map((exercise: { id: string }) => exercise.id)).toEqual(order);
      const stored = await prisma.gymPlanExercise.findMany({ where: { dayId }, orderBy: { sortOrder: 'asc' } });
      expect(stored.map(row => [row.id, row.sortOrder])).toEqual([
        [ids[2], 0],
        [ids[0], 1],
        [ids[1], 2],
      ]);
    });

    it('returns 409 when the list leaves out an exercise of the day', async () => {
      const { dayId, ids } = await dayWithThreeExercises();

      const res = await request(app)
        .put(`/api/gym/days/${dayId}/exercises/order`)
        .set('Authorization', auth)
        .send({ exerciseIds: [ids[1], ids[0]] });

      expect(res.status).toBe(409);
      expect(res.body.message).toBe('La lista no coincide con los ejercicios del día');
    });

    it('returns 409 when the list includes an exercise of another day and changes nothing', async () => {
      const { plan, dayId, ids } = await dayWithThreeExercises();
      const friday = await createGymExercise(plan.id, { weekday: 'FRIDAY', name: 'Remo' });

      const res = await request(app)
        .put(`/api/gym/days/${dayId}/exercises/order`)
        .set('Authorization', auth)
        .send({ exerciseIds: [ids[2], ids[1], friday.id] });

      expect(res.status).toBe(409);
      const stored = await prisma.gymPlanExercise.findMany({ where: { dayId }, orderBy: { sortOrder: 'asc' } });
      expect(stored.map(row => row.id)).toEqual(ids);
    });

    it('returns 400 for repeated ids', async () => {
      const { dayId, ids } = await dayWithThreeExercises();

      const res = await request(app)
        .put(`/api/gym/days/${dayId}/exercises/order`)
        .set('Authorization', auth)
        .send({ exerciseIds: [ids[0], ids[0], ids[1]] });

      expect(res.status).toBe(400);
    });

    it('returns 409 when the plan is archived', async () => {
      const { dayId, ids } = await dayWithThreeExercises('ARCHIVED');

      const res = await request(app)
        .put(`/api/gym/days/${dayId}/exercises/order`)
        .set('Authorization', auth)
        .send({ exerciseIds: [...ids].reverse() });

      expect(res.status).toBe(409);
      expect(res.body.message).toBe('El plan está archivado');
    });

    it('returns 404 for a day of another user', async () => {
      const plan = await otherUserPlan();
      const exercise = await createGymExercise(plan.id);

      const res = await request(app)
        .put(`/api/gym/days/${exercise.dayId}/exercises/order`)
        .set('Authorization', auth)
        .send({ exerciseIds: [exercise.id] });

      expect(res.status).toBe(404);
    });
  });

  describe('exercises', () => {
    it('POST /exercises creates the day and the exercise', async () => {
      const plan = await createGymPlan(user.id);

      const res = await request(app)
        .post('/api/gym/exercises')
        .set('Authorization', auth)
        .send({ planId: plan.id, weekday: 'MONDAY', name: 'Sentadilla', sets: 4, reps: '6' });

      expect(res.status).toBe(201);
      expect(res.body.days[0]).toMatchObject({ weekday: 'MONDAY' });
      expect(res.body.days[0].exercises[0]).toMatchObject({
        name: 'Sentadilla',
        sets: 4,
        reps: '6',
        currentWeightKg: null,
        sortOrder: 0,
      });
    });

    it('POST /exercises reuses an existing day', async () => {
      const plan = await createGymPlan(user.id);
      await createGymExercise(plan.id, { weekday: 'MONDAY', name: 'Sentadilla' });

      const res = await request(app)
        .post('/api/gym/exercises')
        .set('Authorization', auth)
        .send({ planId: plan.id, weekday: 'MONDAY', name: 'Peso muerto', reps: '5' });

      expect(res.status).toBe(201);
      expect(await prisma.gymPlanDay.count({ where: { planId: plan.id } })).toBe(1);
      expect(res.body.days[0].exercises).toHaveLength(2);
    });

    it('POST /exercises rejects the old free-text dayLabel', async () => {
      const plan = await createGymPlan(user.id);

      const res = await request(app)
        .post('/api/gym/exercises')
        .set('Authorization', auth)
        .send({ planId: plan.id, dayLabel: 'Lunes', name: 'Sentadilla', reps: '6' });

      expect(res.status).toBe(400);
      expect(res.body.errors).toHaveProperty('weekday');
    });

    it('POST /exercises returns 409 when the plan is archived', async () => {
      const plan = await createGymPlan(user.id, { status: 'ARCHIVED' });

      const res = await request(app)
        .post('/api/gym/exercises')
        .set('Authorization', auth)
        .send({ planId: plan.id, weekday: 'MONDAY', name: 'Sentadilla', reps: '6' });

      expect(res.status).toBe(409);
      expect(res.body.message).toBe('El plan está archivado');
    });

    it('POST /exercises returns 404 for a plan of another user', async () => {
      const plan = await otherUserPlan();

      const res = await request(app)
        .post('/api/gym/exercises')
        .set('Authorization', auth)
        .send({ planId: plan.id, weekday: 'MONDAY', name: 'Sentadilla', reps: '6' });

      expect(res.status).toBe(404);
      expect(await prisma.gymPlanDay.count({ where: { planId: plan.id } })).toBe(0);
    });

    describe('catalog variants', () => {
      it('POST /exercises reuses the variant of another plan, with its weight', async () => {
        const first = await createGymPlan(user.id);
        const existing = await createGymExercise(first.id, {
          name: 'Sentadilla',
          sets: 4,
          reps: '12',
          currentWeightKg: 80,
        });
        const second = await createGymPlan(user.id);

        const res = await request(app)
          .post('/api/gym/exercises')
          .set('Authorization', auth)
          .send({ planId: second.id, weekday: 'TUESDAY', name: '  SENTADILLA ', sets: 4, reps: '12' });

        expect(res.status).toBe(201);
        expect(res.body.days[0].exercises[0]).toMatchObject({
          catalogId: existing.exerciseId,
          name: 'Sentadilla',
          currentWeightKg: 80,
        });
        expect(await prisma.gymExercise.count({ where: { userId: user.id } })).toBe(1);
      });

      it('POST /exercises treats different sets or reps as a different variant', async () => {
        const plan = await createGymPlan(user.id);
        const heavy = await createGymExercise(plan.id, {
          name: 'Sentadilla',
          sets: 3,
          reps: '8',
          currentWeightKg: 100,
        });

        const res = await request(app)
          .post('/api/gym/exercises')
          .set('Authorization', auth)
          .send({ planId: plan.id, weekday: 'MONDAY', name: 'Sentadilla', sets: 4, reps: '12' });

        expect(res.status).toBe(201);
        const [first, second] = res.body.days[0].exercises;
        expect(first).toMatchObject({ catalogId: heavy.exerciseId, sets: 3, reps: '8', currentWeightKg: 100 });
        expect(second).toMatchObject({ sets: 4, reps: '12', currentWeightKg: null });
        expect(second.catalogId).not.toBe(heavy.exerciseId);
      });

      it('POST /exercises compares reps without spaces or case', async () => {
        const plan = await createGymPlan(user.id);
        const existing = await createGymExercise(plan.id, { name: 'Press banca', sets: 4, reps: '8-12' });
        const other = await createGymPlan(user.id);

        const res = await request(app)
          .post('/api/gym/exercises')
          .set('Authorization', auth)
          .send({ planId: other.id, weekday: 'MONDAY', name: 'press banca', sets: 4, reps: '8 - 12' });

        expect(res.status).toBe(201);
        expect(res.body.days[0].exercises[0]).toMatchObject({ catalogId: existing.exerciseId, reps: '8-12' });
      });

      it('POST /exercises reuses a variant without sets', async () => {
        const plan = await createGymPlan(user.id);
        const existing = await createGymExercise(plan.id, { name: 'Plancha', sets: null, reps: '60s' });
        const other = await createGymPlan(user.id);

        const res = await request(app)
          .post('/api/gym/exercises')
          .set('Authorization', auth)
          .send({ planId: other.id, weekday: 'MONDAY', name: 'Plancha', reps: '60s' });

        expect(res.status).toBe(201);
        expect(res.body.days[0].exercises[0]).toMatchObject({ catalogId: existing.exerciseId, sets: null });
        expect(await prisma.gymExercise.count({ where: { userId: user.id } })).toBe(1);
      });

      it('the database rejects a repeated variant without sets', async () => {
        const key = { userId: user.id, name: 'Plancha', nameNormalized: 'plancha', reps: '60s', repsNormalized: '60s' };
        await prisma.gymExercise.create({ data: key });

        await expect(withSavepoint(() => prisma.gymExercise.create({ data: key }))).rejects.toMatchObject({
          code: 'P2002',
        });
      });

      it('POST /exercises does not share variants between users', async () => {
        const foreign = await otherUserPlan();
        const foreignExercise = await createGymExercise(foreign.id, { name: 'Sentadilla', sets: 4, reps: '6' });
        const plan = await createGymPlan(user.id);

        const res = await request(app)
          .post('/api/gym/exercises')
          .set('Authorization', auth)
          .send({ planId: plan.id, weekday: 'MONDAY', name: 'Sentadilla', sets: 4, reps: '6' });

        expect(res.body.days[0].exercises[0].catalogId).not.toBe(foreignExercise.exerciseId);
      });

      it('POST /exercises returns 409 when the same variant is already in that day', async () => {
        const plan = await createGymPlan(user.id);
        await createGymExercise(plan.id, { weekday: 'MONDAY', name: 'Sentadilla', sets: 4, reps: '12' });

        const res = await request(app)
          .post('/api/gym/exercises')
          .set('Authorization', auth)
          .send({ planId: plan.id, weekday: 'MONDAY', name: 'sentadilla', sets: 4, reps: '12' });

        expect(res.status).toBe(409);
        expect(res.body.message).toBe('El ejercicio ya está en ese día');
        expect(await prisma.gymPlanExercise.count({ where: { day: { planId: plan.id } } })).toBe(1);
      });

      it('POST /exercises allows the same variant on another day of the plan', async () => {
        const plan = await createGymPlan(user.id);
        const monday = await createGymExercise(plan.id, { weekday: 'MONDAY', name: 'Sentadilla' });

        const res = await request(app)
          .post('/api/gym/exercises')
          .set('Authorization', auth)
          .send({ planId: plan.id, weekday: 'THURSDAY', name: 'Sentadilla', sets: 4, reps: '6' });

        expect(res.status).toBe(201);
        expect(res.body.days[1].exercises[0].catalogId).toBe(monday.exerciseId);
      });
    });

    it('PATCH /exercises/:exerciseId updates the exercise', async () => {
      const plan = await createGymPlan(user.id);
      const exercise = await createGymExercise(plan.id, { name: 'Press plano' });

      const res = await request(app)
        .patch(`/api/gym/exercises/${exercise.id}`)
        .set('Authorization', auth)
        .send({ name: 'Press inclinado' });

      expect(res.status).toBe(200);
      const stored = await prisma.gymExercise.findUnique({ where: { id: exercise.exerciseId } });
      expect(stored).toMatchObject({ name: 'Press inclinado', nameNormalized: 'press inclinado' });
    });

    it('PATCH /exercises/:exerciseId renames the variant in every plan that uses it', async () => {
      const first = await createGymPlan(user.id);
      const second = await createGymPlan(user.id);
      const exercise = await createGymExercise(first.id, { name: 'Sentadila' });
      await createGymExercise(second.id, { name: 'Sentadila' });

      await request(app)
        .patch(`/api/gym/exercises/${exercise.id}`)
        .set('Authorization', auth)
        .send({ name: 'Sentadilla' });

      const detail = await request(app).get(`/api/gym/plans/${second.id}`).set('Authorization', auth);
      expect(detail.body.days[0].exercises[0].name).toBe('Sentadilla');
    });

    it('PATCH /exercises/:exerciseId returns 409 when the edit matches another variant', async () => {
      const plan = await createGymPlan(user.id);
      await createGymExercise(plan.id, { weekday: 'MONDAY', name: 'Sentadilla', sets: 4, reps: '12' });
      const other = await createGymExercise(plan.id, { weekday: 'FRIDAY', name: 'Sentadilla', sets: 3, reps: '8' });

      const res = await request(app)
        .patch(`/api/gym/exercises/${other.id}`)
        .set('Authorization', auth)
        .send({ sets: 4, reps: '12' });

      expect(res.status).toBe(409);
      expect(res.body.message).toBe('Ya existe un ejercicio con ese nombre, series y repeticiones');
      expect(await prisma.gymExercise.findUnique({ where: { id: other.exerciseId } })).toMatchObject({
        sets: 3,
        reps: '8',
      });
    });

    it('PATCH /exercises/:exerciseId allows changing only the case or spacing of the variant', async () => {
      const plan = await createGymPlan(user.id);
      const exercise = await createGymExercise(plan.id, { name: 'sentadilla', reps: '8-12' });

      const res = await request(app)
        .patch(`/api/gym/exercises/${exercise.id}`)
        .set('Authorization', auth)
        .send({ name: 'Sentadilla', reps: '8 - 12' });

      expect(res.status).toBe(200);
      expect(res.body.days[0].exercises[0]).toMatchObject({ name: 'Sentadilla', reps: '8 - 12' });
    });

    it('PATCH /exercises/:exerciseId records a history entry when sets or reps change with a weight loaded', async () => {
      const plan = await createGymPlan(user.id);
      const exercise = await createGymExercise(plan.id, { sets: 4, reps: '12', currentWeightKg: 60 });

      await request(app).patch(`/api/gym/exercises/${exercise.id}`).set('Authorization', auth).send({ reps: '10' });

      const entries = await prisma.gymExerciseWeightEntry.findMany({ where: { exerciseId: exercise.exerciseId } });
      expect(entries).toHaveLength(1);
      expect(entries[0]).toMatchObject({ sets: 4, reps: '10' });
      expect(Number(entries[0]?.weightKg)).toBe(60);
    });

    it('PATCH /exercises/:exerciseId records nothing when there is no weight or only the name changes', async () => {
      const plan = await createGymPlan(user.id);
      const noWeight = await createGymExercise(plan.id, { name: 'Prensa', sets: 4, reps: '12' });
      const weighted = await createGymExercise(plan.id, { name: 'Remo', sets: 4, reps: '12', currentWeightKg: 50 });

      await request(app).patch(`/api/gym/exercises/${noWeight.id}`).set('Authorization', auth).send({ sets: 5 });
      await request(app)
        .patch(`/api/gym/exercises/${weighted.id}`)
        .set('Authorization', auth)
        .send({ name: 'Remo con barra' });

      expect(await prisma.gymExerciseWeightEntry.count()).toBe(0);
    });

    it('PATCH /exercises/:exerciseId returns 404 for an exercise of another user', async () => {
      const plan = await otherUserPlan();
      const exercise = await createGymExercise(plan.id);

      const res = await request(app)
        .patch(`/api/gym/exercises/${exercise.id}`)
        .set('Authorization', auth)
        .send({ name: 'Otro' });

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Ejercicio no encontrado');
    });

    it('PATCH /exercises/:exerciseId/weight stores the weight', async () => {
      const plan = await createGymPlan(user.id);
      const exercise = await createGymExercise(plan.id);

      const res = await request(app)
        .patch(`/api/gym/exercises/${exercise.id}/weight`)
        .set('Authorization', auth)
        .send({ weightKg: 62.5 });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        id: exercise.id,
        catalogId: exercise.exerciseId,
        name: 'Sentadilla',
        sets: 4,
        reps: '6',
        currentWeightKg: 62.5,
        sortOrder: 0,
      });
      const stored = await prisma.gymExercise.findUnique({ where: { id: exercise.exerciseId } });
      expect(Number(stored?.currentWeightKg)).toBe(62.5);
    });

    it('PATCH /exercises/:exerciseId/weight is shared by every plan that uses the variant', async () => {
      const first = await createGymPlan(user.id);
      const second = await createGymPlan(user.id);
      const exercise = await createGymExercise(first.id);
      await createGymExercise(second.id);

      await request(app)
        .patch(`/api/gym/exercises/${exercise.id}/weight`)
        .set('Authorization', auth)
        .send({ weightKg: 90 });

      const detail = await request(app).get(`/api/gym/plans/${second.id}`).set('Authorization', auth);
      expect(detail.body.days[0].exercises[0].currentWeightKg).toBe(90);
    });

    it('PATCH /exercises/:exerciseId/weight records each new weight with the current sets and reps', async () => {
      const plan = await createGymPlan(user.id);
      const exercise = await createGymExercise(plan.id, { sets: 4, reps: '8-12' });

      await request(app)
        .patch(`/api/gym/exercises/${exercise.id}/weight`)
        .set('Authorization', auth)
        .send({ weightKg: 60 });
      await request(app)
        .patch(`/api/gym/exercises/${exercise.id}/weight`)
        .set('Authorization', auth)
        .send({ weightKg: 65 });

      const entries = await prisma.gymExerciseWeightEntry.findMany({
        where: { exerciseId: exercise.exerciseId },
        orderBy: { weightKg: 'asc' },
      });
      expect(entries.map(entry => [Number(entry.weightKg), entry.sets, entry.reps])).toEqual([
        [60, 4, '8-12'],
        [65, 4, '8-12'],
      ]);
    });

    it('PATCH /exercises/:exerciseId/weight skips an unchanged weight and a null one', async () => {
      const plan = await createGymPlan(user.id);
      const exercise = await createGymExercise(plan.id, { currentWeightKg: 70 });

      const same = await request(app)
        .patch(`/api/gym/exercises/${exercise.id}/weight`)
        .set('Authorization', auth)
        .send({ weightKg: 70 });
      const cleared = await request(app)
        .patch(`/api/gym/exercises/${exercise.id}/weight`)
        .set('Authorization', auth)
        .send({ weightKg: null });

      expect(same.status).toBe(200);
      expect(cleared.body.currentWeightKg).toBeNull();
      expect(await prisma.gymExerciseWeightEntry.count({ where: { exerciseId: exercise.exerciseId } })).toBe(0);
    });

    it('PATCH /exercises/:exerciseId/weight returns 409 when the plan is archived', async () => {
      const plan = await createGymPlan(user.id, { status: 'ARCHIVED' });
      const exercise = await createGymExercise(plan.id);

      const res = await request(app)
        .patch(`/api/gym/exercises/${exercise.id}/weight`)
        .set('Authorization', auth)
        .send({ weightKg: 70 });

      expect(res.status).toBe(409);
      expect(res.body.message).toBe('El plan está archivado');
      expect(await prisma.gymExerciseWeightEntry.count()).toBe(0);
    });

    it('DELETE /exercises/:exerciseId returns 204 and removes the row', async () => {
      const plan = await createGymPlan(user.id);
      const exercise = await createGymExercise(plan.id);

      const res = await request(app).delete(`/api/gym/exercises/${exercise.id}`).set('Authorization', auth);

      expect(res.status).toBe(204);
      expect(await prisma.gymPlanExercise.findUnique({ where: { id: exercise.id } })).toBeNull();
    });

    it('DELETE /exercises/:exerciseId removes the variant and its history when no plan uses it anymore', async () => {
      const plan = await createGymPlan(user.id);
      const exercise = await createGymExercise(plan.id, { currentWeightKg: 80 });
      await prisma.gymExerciseWeightEntry.create({
        data: { exerciseId: exercise.exerciseId, weightKg: 80, sets: 4, reps: '6' },
      });

      await request(app).delete(`/api/gym/exercises/${exercise.id}`).set('Authorization', auth);

      expect(await prisma.gymExercise.findUnique({ where: { id: exercise.exerciseId } })).toBeNull();
      expect(await prisma.gymExerciseWeightEntry.count()).toBe(0);
    });

    it('DELETE /exercises/:exerciseId keeps the variant while another plan uses it', async () => {
      const plan = await createGymPlan(user.id);
      const archived = await createGymPlan(user.id, { status: 'ARCHIVED' });
      const exercise = await createGymExercise(plan.id);
      await createGymExercise(archived.id);

      await request(app).delete(`/api/gym/exercises/${exercise.id}`).set('Authorization', auth);

      expect(await prisma.gymExercise.findUnique({ where: { id: exercise.exerciseId } })).not.toBeNull();
    });

    it('DELETE /exercises/:exerciseId returns 409 when the plan is archived and keeps the exercise', async () => {
      const plan = await createGymPlan(user.id, { status: 'ARCHIVED' });
      const exercise = await createGymExercise(plan.id);

      const res = await request(app).delete(`/api/gym/exercises/${exercise.id}`).set('Authorization', auth);

      expect(res.status).toBe(409);
      expect(res.body.message).toBe('El plan está archivado');
      expect(await prisma.gymPlanExercise.findUnique({ where: { id: exercise.id } })).not.toBeNull();
      expect(await prisma.gymPlan.findUnique({ where: { id: plan.id } })).not.toBeNull();
    });

    it('DELETE /exercises/:exerciseId keeps the day while it still has exercises', async () => {
      const plan = await createGymPlan(user.id);
      const first = await createGymExercise(plan.id, { weekday: 'MONDAY', name: 'Sentadilla' });
      await createGymExercise(plan.id, { weekday: 'MONDAY', name: 'Prensa' });

      await request(app).delete(`/api/gym/exercises/${first.id}`).set('Authorization', auth);

      expect(await prisma.gymPlanDay.count({ where: { planId: plan.id } })).toBe(1);
    });

    it('DELETE /exercises/:exerciseId removes the empty day but keeps the other days', async () => {
      const plan = await createGymPlan(user.id);
      const monday = await createGymExercise(plan.id, { weekday: 'MONDAY' });
      await createGymExercise(plan.id, { weekday: 'TUESDAY' });

      const res = await request(app).delete(`/api/gym/exercises/${monday.id}`).set('Authorization', auth);

      expect(res.status).toBe(204);
      const days = await prisma.gymPlanDay.findMany({ where: { planId: plan.id } });
      expect(days.map(day => day.weekday)).toEqual(['TUESDAY']);
    });

    it('DELETE /exercises/:exerciseId keeps the plan when it runs out of exercises', async () => {
      const plan = await createGymPlan(user.id, { name: 'Fuerza' });
      const exercise = await createGymExercise(plan.id);

      await request(app).delete(`/api/gym/exercises/${exercise.id}`).set('Authorization', auth);

      const stored = await prisma.gymPlan.findUnique({ where: { id: plan.id } });
      expect(stored).toMatchObject({ name: 'Fuerza', status: 'ACTIVE' });
      expect(await prisma.gymPlanDay.count({ where: { planId: plan.id } })).toBe(0);

      const detail = await request(app).get(`/api/gym/plans/${plan.id}`).set('Authorization', auth);
      expect(detail.status).toBe(200);
      expect(detail.body.days).toEqual([]);
    });

    it('DELETE /exercises/:exerciseId returns 404 for an exercise of another user', async () => {
      const plan = await otherUserPlan();
      const exercise = await createGymExercise(plan.id);

      const res = await request(app).delete(`/api/gym/exercises/${exercise.id}`).set('Authorization', auth);

      expect(res.status).toBe(404);
      expect(await prisma.gymPlanExercise.findUnique({ where: { id: exercise.id } })).not.toBeNull();
    });

    it('PATCH /exercises/:exerciseId moves the exercise to a new day and removes the empty source day', async () => {
      const plan = await createGymPlan(user.id);
      const exercise = await createGymExercise(plan.id, { weekday: 'MONDAY' });

      const res = await request(app)
        .patch(`/api/gym/exercises/${exercise.id}`)
        .set('Authorization', auth)
        .send({ weekday: 'WEDNESDAY' });

      expect(res.status).toBe(200);
      expect(res.body.days.map((day: { weekday: string }) => day.weekday)).toEqual(['WEDNESDAY']);
      expect(await prisma.gymPlanDay.count({ where: { planId: plan.id } })).toBe(1);
    });

    it('PATCH /exercises/:exerciseId keeps the source day when it still has exercises', async () => {
      const plan = await createGymPlan(user.id);
      const moved = await createGymExercise(plan.id, { weekday: 'MONDAY', name: 'Sentadilla' });
      await createGymExercise(plan.id, { weekday: 'MONDAY', name: 'Prensa' });

      await request(app)
        .patch(`/api/gym/exercises/${moved.id}`)
        .set('Authorization', auth)
        .send({ weekday: 'WEDNESDAY' });

      const days = await prisma.gymPlanDay.findMany({ where: { planId: plan.id }, orderBy: { weekday: 'asc' } });
      expect(days.map(day => day.weekday)).toEqual(['MONDAY', 'WEDNESDAY']);
    });

    it('PATCH /exercises/:exerciseId puts the moved exercise at the end of the target day', async () => {
      const plan = await createGymPlan(user.id);
      const moved = await createGymExercise(plan.id, { weekday: 'MONDAY', name: 'Sentadilla' });
      const existing = await createGymExercise(plan.id, { weekday: 'TUESDAY', name: 'Remo' });
      await prisma.gymPlanExercise.update({ where: { id: existing.id }, data: { sortOrder: 4 } });

      await request(app)
        .patch(`/api/gym/exercises/${moved.id}`)
        .set('Authorization', auth)
        .send({ weekday: 'TUESDAY' });

      const stored = await prisma.gymPlanExercise.findUnique({ where: { id: moved.id } });
      expect(stored?.sortOrder).toBe(5);
    });

    it('PATCH /exercises/:exerciseId returns 409 when the target day already has the same variant', async () => {
      const plan = await createGymPlan(user.id);
      const moved = await createGymExercise(plan.id, { weekday: 'MONDAY', name: 'Sentadilla' });
      await createGymExercise(plan.id, { weekday: 'FRIDAY', name: 'Sentadilla' });

      const res = await request(app)
        .patch(`/api/gym/exercises/${moved.id}`)
        .set('Authorization', auth)
        .send({ weekday: 'FRIDAY' });

      expect(res.status).toBe(409);
      expect(res.body.message).toBe('El ejercicio ya está en ese día');
      expect((await prisma.gymPlanExercise.findUnique({ where: { id: moved.id } }))?.dayId).toBe(moved.dayId);
    });

    it('PATCH /exercises/:exerciseId returns 409 when the plan is archived and does not move anything', async () => {
      const plan = await createGymPlan(user.id, { status: 'ARCHIVED' });
      const exercise = await createGymExercise(plan.id, { weekday: 'MONDAY' });

      const res = await request(app)
        .patch(`/api/gym/exercises/${exercise.id}`)
        .set('Authorization', auth)
        .send({ weekday: 'TUESDAY' });

      expect(res.status).toBe(409);
      const days = await prisma.gymPlanDay.findMany({ where: { planId: plan.id } });
      expect(days.map(day => day.weekday)).toEqual(['MONDAY']);
    });
  });

  describe('weight history', () => {
    async function exerciseWithHistory(status: 'ACTIVE' | 'ARCHIVED' = 'ACTIVE') {
      const plan = await createGymPlan(user.id, { status });
      const exercise = await createGymExercise(plan.id, { sets: 4, reps: '8', currentWeightKg: 70 });
      const entries = [
        { weightKg: 60, recordedAt: new Date('2026-01-01T10:00:00.000Z') },
        { weightKg: 70, recordedAt: new Date('2026-03-01T10:00:00.000Z') },
        { weightKg: 65, recordedAt: new Date('2026-02-01T10:00:00.000Z') },
      ];
      for (const entry of entries) {
        await prisma.gymExerciseWeightEntry.create({
          data: { exerciseId: exercise.exerciseId, sets: 4, reps: '8', ...entry },
        });
      }
      return exercise;
    }

    it('GET /exercises/:exerciseId/weight-history returns the entries newest first', async () => {
      const exercise = await exerciseWithHistory();

      const res = await request(app).get(`/api/gym/exercises/${exercise.id}/weight-history`).set('Authorization', auth);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ total: 3, page: 1, limit: 50 });
      expect(res.body.items).toEqual([
        { id: expect.any(String), weightKg: 70, sets: 4, reps: '8', recordedAt: '2026-03-01T10:00:00.000Z' },
        { id: expect.any(String), weightKg: 65, sets: 4, reps: '8', recordedAt: '2026-02-01T10:00:00.000Z' },
        { id: expect.any(String), weightKg: 60, sets: 4, reps: '8', recordedAt: '2026-01-01T10:00:00.000Z' },
      ]);
    });

    it('GET /exercises/:exerciseId/weight-history paginates with numeric take and skip', async () => {
      const exercise = await exerciseWithHistory();

      const res = await request(app)
        .get(`/api/gym/exercises/${exercise.id}/weight-history?page=2&limit=2`)
        .set('Authorization', auth);

      expect(res.body.items.map((entry: { weightKg: number }) => entry.weightKg)).toEqual([60]);
      const call = findRecordedCall('gymExerciseWeightEntry', 'findMany');
      expect(call?.args?.take).toBe(2);
      expect(call?.args?.skip).toBe(2);
    });

    it('GET /exercises/:exerciseId/weight-history can be read on an archived plan', async () => {
      const exercise = await exerciseWithHistory('ARCHIVED');

      const res = await request(app).get(`/api/gym/exercises/${exercise.id}/weight-history`).set('Authorization', auth);

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(3);
    });

    it('GET /exercises/:exerciseId/weight-history returns 404 for an exercise of another user', async () => {
      const plan = await otherUserPlan();
      const exercise = await createGymExercise(plan.id);

      const res = await request(app).get(`/api/gym/exercises/${exercise.id}/weight-history`).set('Authorization', auth);

      expect(res.status).toBe(404);
    });

    it('GET /exercises/catalog/:catalogId/weight-history returns the same history by variant', async () => {
      const exercise = await exerciseWithHistory();

      const res = await request(app)
        .get(`/api/gym/exercises/catalog/${exercise.exerciseId}/weight-history?limit=1`)
        .set('Authorization', auth);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ total: 3, page: 1, limit: 1 });
      expect(res.body.items[0]).toMatchObject({ weightKg: 70 });
    });

    it('GET /exercises/catalog/:catalogId/weight-history returns 404 for a variant of another user', async () => {
      const plan = await otherUserPlan();
      const exercise = await createGymExercise(plan.id);

      const res = await request(app)
        .get(`/api/gym/exercises/catalog/${exercise.exerciseId}/weight-history`)
        .set('Authorization', auth);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Ejercicio no encontrado');
    });
  });

  describe('catalog', () => {
    async function seedCatalog() {
      const plan = await createGymPlan(user.id);
      await createGymExercise(plan.id, { weekday: 'MONDAY', name: 'Sentadilla', sets: 4, reps: '12' });
      await createGymExercise(plan.id, {
        weekday: 'MONDAY',
        name: 'Sentadilla',
        sets: 3,
        reps: '8',
        currentWeightKg: 100,
      });
      await createGymExercise(plan.id, { weekday: 'FRIDAY', name: 'Press banca', sets: 4, reps: '10' });
      const foreign = await otherUserPlan();
      await createGymExercise(foreign.id, { name: 'Sentadilla búlgara' });
    }

    it('GET /exercises/catalog filters by name without case and only shows the user variants', async () => {
      await seedCatalog();

      const res = await request(app).get('/api/gym/exercises/catalog?q=SENTA').set('Authorization', auth);

      expect(res.status).toBe(200);
      expect(res.body).toEqual([
        { id: expect.any(String), name: 'Sentadilla', sets: 3, reps: '8', currentWeightKg: 100 },
        { id: expect.any(String), name: 'Sentadilla', sets: 4, reps: '12', currentWeightKg: null },
      ]);
    });

    it('GET /exercises/catalog without q lists the catalog by name up to the limit', async () => {
      await seedCatalog();

      const all = await request(app).get('/api/gym/exercises/catalog').set('Authorization', auth);
      resetRecordedCalls();
      const limited = await request(app).get('/api/gym/exercises/catalog?limit=1').set('Authorization', auth);

      expect(all.body.map((item: { name: string }) => item.name)).toEqual(['Press banca', 'Sentadilla', 'Sentadilla']);
      expect(limited.body).toHaveLength(1);
      expect(findRecordedCall('gymExercise', 'findMany')?.args?.take).toBe(1);
    });

    it('GET /exercises/catalog rejects a limit over the maximum', async () => {
      const res = await request(app).get('/api/gym/exercises/catalog?limit=21').set('Authorization', auth);

      expect(res.status).toBe(400);
    });
  });

  describe('concurrency', () => {
    it('agregar un ejercicio mientras se borra el último del día no pierde el nuevo', async () => {
      clearPrismaOverride();
      const id = `gym-race-${randomUUID()}`;
      const owner = await basePrisma.user.create({
        data: { id, username: id, name: 'Test User', password: 'sin-uso', role: 'USER' },
      });
      const ownerAuth = authHeader(toJwtUser(owner));

      try {
        for (let round = 0; round < 8; round += 1) {
          const plan = await basePrisma.gymPlan.create({ data: { userId: id, name: `Plan ${round}` } });
          const day = await basePrisma.gymPlanDay.create({ data: { planId: plan.id, weekday: 'MONDAY' } });
          const catalog = await basePrisma.gymExercise.create({
            data: {
              userId: id,
              name: 'Sentadilla',
              nameNormalized: 'sentadilla',
              sets: 4,
              reps: '6',
              repsNormalized: '6',
            },
          });
          const row = await basePrisma.gymPlanExercise.create({
            data: { dayId: day.id, exerciseId: catalog.id, sortOrder: 0 },
          });

          const [removed, added] = await Promise.all([
            request(app).delete(`/api/gym/exercises/${row.id}`).set('Authorization', ownerAuth),
            request(app)
              .post('/api/gym/exercises')
              .set('Authorization', ownerAuth)
              .send({ planId: plan.id, weekday: 'MONDAY', name: 'Remo', sets: 3, reps: '10' }),
          ]);

          expect(removed.status).toBe(204);
          expect(added.status).toBe(201);
          const stored = await basePrisma.gymPlanExercise.findMany({
            where: { day: { planId: plan.id } },
            include: { exercise: true },
          });
          expect(stored.map(item => item.exercise.name)).toEqual(['Remo']);
          await basePrisma.gymExercise.deleteMany({ where: { userId: id } });
        }
      } finally {
        await basePrisma.user.delete({ where: { id } });
      }
    });
  });
});
