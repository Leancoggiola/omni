import { Router } from 'express';
import { idParamsSchema } from '@omni/shared/common';
import {
  completeExpenseReminderSchema,
  createExpenseReminderSchema,
  createPersonalExpenseSchema,
  listExpensesSchema,
  listRemindersSchema,
  snoozeExpenseReminderSchema,
  updateExpenseReminderSchema,
  updatePersonalExpenseSchema,
  type ListExpensesParams,
} from '@omni/shared/expenses';
import { authenticateJwt } from '../auth/middleware/auth.middleware';
import { validate } from '../common/utils';
import * as expensesService from './expenses.service';
import { validatedQuery } from '../common/http';

const router = Router();
router.use(authenticateJwt);

router.get('/summary', validate(listExpensesSchema, 'query'), async (req, res) => {
  const { userId } = req.user!;
  res.json(await expensesService.getSummary(userId, validatedQuery<ListExpensesParams>(req)));
});

router.get('/reminders', validate(listRemindersSchema, 'query'), async (req, res) => {
  const { userId } = req.user!;
  const { status } = validatedQuery<{ status?: 'PENDING' | 'COMPLETED' }>(req);
  res.json(await expensesService.listReminders(userId, status));
});

router.post('/reminders', validate(createExpenseReminderSchema), async (req, res) => {
  const { userId } = req.user!;
  res.status(201).json(await expensesService.createReminder(userId, req.body));
});

router.patch(
  '/reminders/:reminderId',
  validate(idParamsSchema('reminderId'), 'params'),
  validate(updateExpenseReminderSchema),
  async (req, res) => {
    const { userId } = req.user!;
    res.json(await expensesService.updateReminder(userId, req.params.reminderId as string, req.body));
  }
);

router.post(
  '/reminders/:reminderId/complete',
  validate(idParamsSchema('reminderId'), 'params'),
  validate(completeExpenseReminderSchema),
  async (req, res) => {
    const { userId } = req.user!;
    res.json(await expensesService.completeReminder(userId, req.params.reminderId as string, req.body));
  }
);

router.post(
  '/reminders/:reminderId/snooze',
  validate(idParamsSchema('reminderId'), 'params'),
  validate(snoozeExpenseReminderSchema),
  async (req, res) => {
    const { userId } = req.user!;
    res.json(await expensesService.snoozeReminder(userId, req.params.reminderId as string, req.body));
  }
);

router.delete('/reminders/:reminderId', validate(idParamsSchema('reminderId'), 'params'), async (req, res) => {
  const { userId } = req.user!;
  await expensesService.deleteReminder(userId, req.params.reminderId as string);
  res.status(204).send();
});

router.get('/', validate(listExpensesSchema, 'query'), async (req, res) => {
  const { userId } = req.user!;
  res.json(await expensesService.listExpenses(userId, validatedQuery<ListExpensesParams>(req)));
});

router.post('/', validate(createPersonalExpenseSchema), async (req, res) => {
  const { userId } = req.user!;
  res.status(201).json(await expensesService.createExpense(userId, req.body));
});

router.patch(
  '/:expenseId',
  validate(idParamsSchema('expenseId'), 'params'),
  validate(updatePersonalExpenseSchema),
  async (req, res) => {
    const { userId } = req.user!;
    res.json(await expensesService.updateExpense(userId, req.params.expenseId as string, req.body));
  }
);

router.delete('/:expenseId', validate(idParamsSchema('expenseId'), 'params'), async (req, res) => {
  const { userId } = req.user!;
  await expensesService.deleteExpense(userId, req.params.expenseId as string);
  res.status(204).send();
});

export default router;
