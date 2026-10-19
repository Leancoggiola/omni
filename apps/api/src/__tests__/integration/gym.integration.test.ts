import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';

import { prisma } from '../../common/db';
import { authHeader } from '../../test/integration/auth';
import { createIntegrationApp } from '../../test/integration/createIntegrationApp';
import { createGymExercise, createGymPlan, createUser, toJwtUser } from '../../test/integration/factories';
import { findRecordedCall } from '../../test/integration/queryRecorder';

const app = createIntegrationApp();

describe('gym routes (integration)', () => {
  let user: Awaited<ReturnType<typeof createUser>>;
  let auth: string;

  beforeEach(async () => {
    user = await createUser({ username: 'gym-owner' });
    auth = authHeader(toJwtUser(user));
  });

  describe('auth', () => {
    it('returns 401 without auth on GET /plans', async () => {
      const res = await request(app).get('/api/gym/plans');
      expect(res.status).toBe(401);
    });
  });

  describe('plans', () => {
    it('GET /plans returns a paginated list scoped to the user', async () => {
      await createGymPlan(user.id, { name: 'Fuerza' });
      const other = await createUser({ username: 'gym-other' });
      await createGymPlan(other.id, { name: 'Ajeno' });

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

    it('GET /plans/:planId returns the plan detail', async () => {
      const plan = await createGymPlan(user.id, { name: 'Fuerza' });
      await createGymExercise(plan.id, { dayLabel: 'Lunes', name: 'Sentadilla' });

      const res = await request(app).get(`/api/gym/plans/${plan.id}`).set('Authorization', auth);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ id: plan.id, name: 'Fuerza', status: 'ACTIVE' });
      expect(res.body.days).toHaveLength(1);
      expect(res.body.days[0].exercises[0]).toMatchObject({ name: 'Sentadilla' });
    });

    it('GET /plans/:planId returns 404 for an unknown plan', async () => {
      const res = await request(app).get('/api/gym/plans/missing').set('Authorization', auth);
      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Plan no encontrado');
    });

    it('GET /plans/:planId returns 404 when the plan belongs to another user', async () => {
      const other = await createUser({ username: 'gym-other' });
      const plan = await createGymPlan(other.id);

      const res = await request(app).get(`/api/gym/plans/${plan.id}`).set('Authorization', auth);

      expect(res.status).toBe(404);
    });

    it('POST /plans persists the plan', async () => {
      const res = await request(app).post('/api/gym/plans').set('Authorization', auth).send({ name: 'Nuevo plan' });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ name: 'Nuevo plan', status: 'ACTIVE' });
      expect(await prisma.gymPlan.count({ where: { userId: user.id } })).toBe(1);
    });

    it('POST /plans rejects an invalid body', async () => {
      const res = await request(app).post('/api/gym/plans').set('Authorization', auth).send({ name: '' });

      expect(res.status).toBe(400);
      expect(await prisma.gymPlan.count({ where: { userId: user.id } })).toBe(0);
    });

    it('POST /plans/:planId/archive archives the plan', async () => {
      const plan = await createGymPlan(user.id);

      const res = await request(app).post(`/api/gym/plans/${plan.id}/archive`).set('Authorization', auth);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ARCHIVED');
      const stored = await prisma.gymPlan.findUnique({ where: { id: plan.id } });
      expect(stored?.status).toBe('ARCHIVED');
      expect(stored?.archivedAt).not.toBeNull();
    });
  });

  describe('exercises', () => {
    it('POST /exercises creates the day and the exercise', async () => {
      const plan = await createGymPlan(user.id);

      const res = await request(app)
        .post('/api/gym/exercises')
        .set('Authorization', auth)
        .send({ planId: plan.id, dayLabel: 'Lunes', name: 'Sentadilla', sets: 4, reps: '6' });

      expect(res.status).toBe(201);
      expect(res.body.days[0]).toMatchObject({ label: 'Lunes' });
      expect(res.body.days[0].exercises[0]).toMatchObject({ name: 'Sentadilla', sets: 4, reps: '6' });
    });

    it('POST /exercises reuses an existing day', async () => {
      const plan = await createGymPlan(user.id);
      await createGymExercise(plan.id, { dayLabel: 'Lunes', name: 'Sentadilla' });

      const res = await request(app)
        .post('/api/gym/exercises')
        .set('Authorization', auth)
        .send({ planId: plan.id, dayLabel: 'Lunes', name: 'Peso muerto', reps: '5' });

      expect(res.status).toBe(201);
      expect(await prisma.gymPlanDay.count({ where: { planId: plan.id } })).toBe(1);
      expect(res.body.days[0].exercises).toHaveLength(2);
    });

    it('POST /exercises returns 409 when the plan is archived', async () => {
      const plan = await createGymPlan(user.id, { status: 'ARCHIVED' });

      const res = await request(app)
        .post('/api/gym/exercises')
        .set('Authorization', auth)
        .send({ planId: plan.id, dayLabel: 'Lunes', name: 'Sentadilla', reps: '6' });

      expect(res.status).toBe(409);
      expect(res.body.message).toBe('El plan está archivado');
    });

    it('PATCH /exercises/:exerciseId updates the exercise', async () => {
      const plan = await createGymPlan(user.id);
      const exercise = await createGymExercise(plan.id, { name: 'Press plano' });

      const res = await request(app)
        .patch(`/api/gym/exercises/${exercise.id}`)
        .set('Authorization', auth)
        .send({ name: 'Press inclinado' });

      expect(res.status).toBe(200);
      const stored = await prisma.gymExercise.findUnique({ where: { id: exercise.id } });
      expect(stored?.name).toBe('Press inclinado');
    });

    it('PATCH /exercises/:exerciseId returns 404 for an exercise of another user', async () => {
      const other = await createUser({ username: 'gym-other' });
      const plan = await createGymPlan(other.id);
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
      const stored = await prisma.gymExercise.findUnique({ where: { id: exercise.id } });
      expect(Number(stored?.currentWeightKg)).toBe(62.5);
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
    });

    it('DELETE /exercises/:exerciseId returns 204 and removes the row', async () => {
      const plan = await createGymPlan(user.id);
      const exercise = await createGymExercise(plan.id);

      const res = await request(app).delete(`/api/gym/exercises/${exercise.id}`).set('Authorization', auth);

      expect(res.status).toBe(204);
      expect(await prisma.gymExercise.findUnique({ where: { id: exercise.id } })).toBeNull();
    });

    it('DELETE /exercises/:exerciseId returns 409 when the plan is archived and keeps the exercise', async () => {
      const plan = await createGymPlan(user.id, { status: 'ARCHIVED' });
      const exercise = await createGymExercise(plan.id);

      const res = await request(app).delete(`/api/gym/exercises/${exercise.id}`).set('Authorization', auth);

      expect(res.status).toBe(409);
      expect(res.body.message).toBe('El plan está archivado');
      expect(await prisma.gymExercise.findUnique({ where: { id: exercise.id } })).not.toBeNull();
      expect(await prisma.gymPlan.findUnique({ where: { id: plan.id } })).not.toBeNull();
    });

    it('DELETE /exercises/:exerciseId keeps the day while it still has exercises', async () => {
      const plan = await createGymPlan(user.id);
      const first = await createGymExercise(plan.id, { dayLabel: 'Lunes', name: 'Sentadilla' });
      await createGymExercise(plan.id, { dayLabel: 'Lunes', name: 'Prensa' });

      await request(app).delete(`/api/gym/exercises/${first.id}`).set('Authorization', auth);

      expect(await prisma.gymPlanDay.count({ where: { planId: plan.id } })).toBe(1);
    });

    it('DELETE /exercises/:exerciseId removes the empty day but keeps the other days', async () => {
      const plan = await createGymPlan(user.id);
      const monday = await createGymExercise(plan.id, { dayLabel: 'Lunes' });
      await createGymExercise(plan.id, { dayLabel: 'Martes' });

      const res = await request(app).delete(`/api/gym/exercises/${monday.id}`).set('Authorization', auth);

      expect(res.status).toBe(204);
      const days = await prisma.gymPlanDay.findMany({ where: { planId: plan.id } });
      expect(days.map(day => day.label)).toEqual(['Martes']);
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
      const other = await createUser({ username: 'gym-other-delete' });
      const plan = await createGymPlan(other.id);
      const exercise = await createGymExercise(plan.id);

      const res = await request(app).delete(`/api/gym/exercises/${exercise.id}`).set('Authorization', auth);

      expect(res.status).toBe(404);
      expect(await prisma.gymExercise.findUnique({ where: { id: exercise.id } })).not.toBeNull();
    });

    it('PATCH /exercises/:exerciseId moves the exercise to a new day and removes the empty source day', async () => {
      const plan = await createGymPlan(user.id);
      const exercise = await createGymExercise(plan.id, { dayLabel: 'Lunes' });

      const res = await request(app)
        .patch(`/api/gym/exercises/${exercise.id}`)
        .set('Authorization', auth)
        .send({ dayLabel: 'Miércoles' });

      expect(res.status).toBe(200);
      expect(res.body.days.map((day: { label: string }) => day.label)).toEqual(['Miércoles']);
      expect(await prisma.gymPlanDay.count({ where: { planId: plan.id } })).toBe(1);
    });

    it('PATCH /exercises/:exerciseId keeps the source day when it still has exercises', async () => {
      const plan = await createGymPlan(user.id);
      const moved = await createGymExercise(plan.id, { dayLabel: 'Lunes', name: 'Sentadilla' });
      await createGymExercise(plan.id, { dayLabel: 'Lunes', name: 'Prensa' });

      await request(app)
        .patch(`/api/gym/exercises/${moved.id}`)
        .set('Authorization', auth)
        .send({ dayLabel: 'Miércoles' });

      const days = await prisma.gymPlanDay.findMany({ where: { planId: plan.id }, orderBy: { label: 'asc' } });
      expect(days.map(day => day.label)).toEqual(['Lunes', 'Miércoles']);
    });

    it('PATCH /exercises/:exerciseId puts the moved exercise at the end of the target day', async () => {
      const plan = await createGymPlan(user.id);
      const moved = await createGymExercise(plan.id, { dayLabel: 'Lunes', name: 'Sentadilla' });
      const existing = await createGymExercise(plan.id, { dayLabel: 'Martes', name: 'Remo' });
      await prisma.gymExercise.update({ where: { id: existing.id }, data: { sortOrder: 4 } });

      await request(app)
        .patch(`/api/gym/exercises/${moved.id}`)
        .set('Authorization', auth)
        .send({ dayLabel: 'Martes' });

      const stored = await prisma.gymExercise.findUnique({ where: { id: moved.id } });
      expect(stored?.sortOrder).toBe(5);
    });

    it('PATCH /exercises/:exerciseId returns 409 when the plan is archived and does not move anything', async () => {
      const plan = await createGymPlan(user.id, { status: 'ARCHIVED' });
      const exercise = await createGymExercise(plan.id, { dayLabel: 'Lunes' });

      const res = await request(app)
        .patch(`/api/gym/exercises/${exercise.id}`)
        .set('Authorization', auth)
        .send({ dayLabel: 'Martes' });

      expect(res.status).toBe(409);
      const days = await prisma.gymPlanDay.findMany({ where: { planId: plan.id } });
      expect(days.map(day => day.label)).toEqual(['Lunes']);
    });
  });
});
