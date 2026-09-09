import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';

import { prisma } from '../../common/db';
import { authHeader } from '../../test/integration/auth';
import { createIntegrationApp } from '../../test/integration/createIntegrationApp';
import { createExpenseReminder, createPersonalExpense, createUser, toJwtUser } from '../../test/integration/factories';
import { findRecordedCall } from '../../test/integration/queryRecorder';

const app = createIntegrationApp();

describe('expenses routes (integration)', () => {
  let user: Awaited<ReturnType<typeof createUser>>;
  let auth: string;

  beforeEach(async () => {
    user = await createUser({ username: 'expenses-owner' });
    auth = authHeader(toJwtUser(user));
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/expenses/summary?month=2026-08');
    expect(res.status).toBe(401);
  });

  describe('summary', () => {
    it('GET /summary requires month', async () => {
      const res = await request(app).get('/api/expenses/summary').set('Authorization', auth);
      expect(res.status).toBe(400);
    });

    it('GET /summary aggregates the expenses of the month', async () => {
      await createPersonalExpense(user.id, { amount: 1000, category: 'FOOD', date: new Date('2026-08-02') });
      await createPersonalExpense(user.id, { amount: 500, category: 'FOOD', date: new Date('2026-08-10') });
      await createPersonalExpense(user.id, { amount: 300, category: 'TRANSPORT', date: new Date('2026-08-11') });
      await createPersonalExpense(user.id, { amount: 999, category: 'FOOD', date: new Date('2026-07-11') });

      const res = await request(app).get('/api/expenses/summary?month=2026-08').set('Authorization', auth);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        totalAmount: 1800,
        transactionCount: 3,
        activeCategoriesCount: 2,
      });
    });

    it('GET /summary counts pending reminders', async () => {
      await createExpenseReminder(user.id, { status: 'PENDING' });
      await createExpenseReminder(user.id, { status: 'COMPLETED' });

      const res = await request(app).get('/api/expenses/summary?month=2026-08').set('Authorization', auth);

      expect(res.status).toBe(200);
      expect(res.body.pendingRemindersCount).toBe(1);
    });
  });

  describe('expenses', () => {
    it('GET / requires month', async () => {
      const res = await request(app).get('/api/expenses').set('Authorization', auth);
      expect(res.status).toBe(400);
    });

    it('GET / lists the expenses of the month scoped to the user', async () => {
      await createPersonalExpense(user.id, { concept: 'Supermercado', date: new Date('2026-08-02') });
      await createPersonalExpense(user.id, { concept: 'Julio', date: new Date('2026-07-02') });
      const other = await createUser({ username: 'expenses-other' });
      await createPersonalExpense(other.id, { concept: 'Ajeno', date: new Date('2026-08-03') });

      const res = await request(app).get('/api/expenses?month=2026-08').set('Authorization', auth);

      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0]).toMatchObject({ concept: 'Supermercado' });
    });

    it('GET / sends numeric take and skip to Prisma', async () => {
      await createPersonalExpense(user.id, { date: new Date('2026-08-02') });
      await createPersonalExpense(user.id, { date: new Date('2026-08-03') });
      await createPersonalExpense(user.id, { date: new Date('2026-08-04') });

      const res = await request(app).get('/api/expenses?month=2026-08&page=2&limit=2').set('Authorization', auth);

      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(1);
      const call = findRecordedCall('personalExpense', 'findMany');
      expect(call?.args?.take).toBe(2);
      expect(call?.args?.skip).toBe(2);
    });

    it('POST / persists the expense', async () => {
      const res = await request(app)
        .post('/api/expenses')
        .set('Authorization', auth)
        .send({ concept: 'Supermercado', amount: 5000, category: 'FOOD', date: '2026-08-02' });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ concept: 'Supermercado', amount: 5000, category: 'FOOD' });
      expect(await prisma.personalExpense.count({ where: { userId: user.id } })).toBe(1);
    });

    it('POST / returns 400 on an invalid payload', async () => {
      const res = await request(app).post('/api/expenses').set('Authorization', auth).send({ concept: 'Sin monto' });
      expect(res.status).toBe(400);
    });

    it('PATCH /:expenseId updates the expense', async () => {
      const expense = await createPersonalExpense(user.id, { amount: 1000 });

      const res = await request(app)
        .patch(`/api/expenses/${expense.id}`)
        .set('Authorization', auth)
        .send({ amount: 2500 });

      expect(res.status).toBe(200);
      const stored = await prisma.personalExpense.findUnique({ where: { id: expense.id } });
      expect(Number(stored?.amount)).toBe(2500);
    });

    it('DELETE /:expenseId returns 204 and removes the row', async () => {
      const expense = await createPersonalExpense(user.id);

      const res = await request(app).delete(`/api/expenses/${expense.id}`).set('Authorization', auth);

      expect(res.status).toBe(204);
      expect(await prisma.personalExpense.findUnique({ where: { id: expense.id } })).toBeNull();
    });

    it('DELETE /:expenseId returns 404 for an expense of another user', async () => {
      const other = await createUser({ username: 'expenses-other' });
      const expense = await createPersonalExpense(other.id);

      const res = await request(app).delete(`/api/expenses/${expense.id}`).set('Authorization', auth);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Gasto no encontrado');
    });
  });

  describe('reminders', () => {
    it('GET /reminders lists the reminders of the user', async () => {
      await createExpenseReminder(user.id, { title: 'Alquiler' });
      const other = await createUser({ username: 'expenses-other' });
      await createExpenseReminder(other.id, { title: 'Ajeno' });

      const res = await request(app).get('/api/expenses/reminders').set('Authorization', auth);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toMatchObject({ title: 'Alquiler' });
    });

    it('GET /reminders filters by status', async () => {
      await createExpenseReminder(user.id, { title: 'Pendiente', status: 'PENDING' });
      await createExpenseReminder(user.id, { title: 'Hecho', status: 'COMPLETED' });

      const res = await request(app).get('/api/expenses/reminders?status=COMPLETED').set('Authorization', auth);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toMatchObject({ title: 'Hecho' });
    });

    it('POST /reminders persists the reminder', async () => {
      const res = await request(app)
        .post('/api/expenses/reminders')
        .set('Authorization', auth)
        .send({ title: 'Alquiler', dueDate: '2026-08-05', recurrence: 'MONTHLY' });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ title: 'Alquiler', recurrence: 'MONTHLY', status: 'PENDING' });
      expect(await prisma.expenseReminder.count({ where: { userId: user.id } })).toBe(1);
    });

    it('PATCH /reminders/:reminderId returns 409 when it is already completed', async () => {
      const reminder = await createExpenseReminder(user.id, { status: 'COMPLETED' });

      const res = await request(app)
        .patch(`/api/expenses/reminders/${reminder.id}`)
        .set('Authorization', auth)
        .send({ title: 'Otro' });

      expect(res.status).toBe(409);
      expect(res.body.message).toBe('No se puede editar un recordatorio completado');
    });

    it('POST /reminders/:reminderId/snooze moves the due date', async () => {
      const reminder = await createExpenseReminder(user.id, { dueDate: new Date('2026-08-05') });

      const res = await request(app)
        .post(`/api/expenses/reminders/${reminder.id}/snooze`)
        .set('Authorization', auth)
        .send({ until: '2026-09-05' });

      expect(res.status).toBe(200);
      expect(res.body.dueDate).toBe('2026-09-05');
    });

    it('POST /reminders/:reminderId/snooze returns 409 when it is completed', async () => {
      const reminder = await createExpenseReminder(user.id, { status: 'COMPLETED' });

      const res = await request(app)
        .post(`/api/expenses/reminders/${reminder.id}/snooze`)
        .set('Authorization', auth)
        .send({ days: 3 });

      expect(res.status).toBe(409);
      expect(res.body.message).toBe('Solo se pueden posponer recordatorios pendientes');
    });

    it('DELETE /reminders/:reminderId returns 204', async () => {
      const reminder = await createExpenseReminder(user.id);

      const res = await request(app).delete(`/api/expenses/reminders/${reminder.id}`).set('Authorization', auth);

      expect(res.status).toBe(204);
      expect(await prisma.expenseReminder.findUnique({ where: { id: reminder.id } })).toBeNull();
    });

    it('DELETE /reminders/:reminderId returns 404 for a reminder of another user', async () => {
      const other = await createUser({ username: 'expenses-other' });
      const reminder = await createExpenseReminder(other.id);

      const res = await request(app).delete(`/api/expenses/reminders/${reminder.id}`).set('Authorization', auth);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Recordatorio no encontrado');
    });
  });

  // completeReminder es el único service que abre su propio prisma.$transaction, así que
  // también cubre el shim de transacción anidada que instala el override de test.
  describe('completing a reminder', () => {
    it('creates the linked expense and completes a one-off reminder', async () => {
      const reminder = await createExpenseReminder(user.id, {
        title: 'Seguro',
        recurrence: 'ONCE',
        dueDate: new Date('2026-08-05'),
      });

      const res = await request(app)
        .post(`/api/expenses/reminders/${reminder.id}/complete`)
        .set('Authorization', auth)
        .send({ amount: 7500, category: 'SERVICES', expenseDate: '2026-08-06' });

      expect(res.status).toBe(200);
      expect(res.body.expense).toMatchObject({ concept: 'Seguro', amount: 7500, category: 'SERVICES' });
      expect(res.body.reminder.status).toBe('COMPLETED');

      const expense = await prisma.personalExpense.findFirst({ where: { userId: user.id } });
      expect(expense?.reminderId).toBe(reminder.id);
    });

    it('rolls the due date forward for a monthly reminder', async () => {
      const reminder = await createExpenseReminder(user.id, {
        recurrence: 'MONTHLY',
        dueDate: new Date('2026-08-05'),
      });

      const res = await request(app)
        .post(`/api/expenses/reminders/${reminder.id}/complete`)
        .set('Authorization', auth)
        .send({ amount: 1000, category: 'HOME' });

      expect(res.status).toBe(200);
      expect(res.body.reminder.status).toBe('PENDING');
      expect(res.body.reminder.dueDate).toBe('2026-09-05');
    });

    it('returns 409 when the reminder is already completed', async () => {
      const reminder = await createExpenseReminder(user.id, { status: 'COMPLETED' });

      const res = await request(app)
        .post(`/api/expenses/reminders/${reminder.id}/complete`)
        .set('Authorization', auth)
        .send({ amount: 1000, category: 'HOME' });

      expect(res.status).toBe(409);
      expect(res.body.message).toBe('El recordatorio ya está completado');
    });
  });
});
