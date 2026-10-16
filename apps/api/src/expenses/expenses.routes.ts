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

const router = Router();
router.use(authenticateJwt);

router.get('/summary', validate(listExpensesSchema, 'query'), async (req, res, next) => {
  try {
    const { userId } = req.user as { userId: string };
    res.json(await expensesService.getSummary(userId, req.query as unknown as ListExpensesParams));
  } catch (err) {
    next(err);
  }
});

router.get('/reminders', validate(listRemindersSchema, 'query'), async (req, res, next) => {
  try {
    const { userId } = req.user as { userId: string };
    const { status } = req.query as { status?: 'PENDING' | 'COMPLETED' };
    res.json(await expensesService.listReminders(userId, status));
  } catch (err) {
    next(err);
  }
});

router.post('/reminders', validate(createExpenseReminderSchema), async (req, res, next) => {
  try {
    const { userId } = req.user as { userId: string };
    res.status(201).json(await expensesService.createReminder(userId, req.body));
  } catch (err) {
    next(err);
  }
});

router.patch(
  '/reminders/:reminderId',
  validate(idParamsSchema('reminderId'), 'params'),
  validate(updateExpenseReminderSchema),
  async (req, res, next) => {
    try {
      const { userId } = req.user as { userId: string };
      res.json(await expensesService.updateReminder(userId, req.params.reminderId as string, req.body));
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/reminders/:reminderId/complete',
  validate(idParamsSchema('reminderId'), 'params'),
  validate(completeExpenseReminderSchema),
  async (req, res, next) => {
    try {
      const { userId } = req.user as { userId: string };
      res.json(await expensesService.completeReminder(userId, req.params.reminderId as string, req.body));
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/reminders/:reminderId/snooze',
  validate(idParamsSchema('reminderId'), 'params'),
  validate(snoozeExpenseReminderSchema),
  async (req, res, next) => {
    try {
      const { userId } = req.user as { userId: string };
      res.json(await expensesService.snoozeReminder(userId, req.params.reminderId as string, req.body));
    } catch (err) {
      next(err);
    }
  }
);

router.delete('/reminders/:reminderId', validate(idParamsSchema('reminderId'), 'params'), async (req, res, next) => {
  try {
    const { userId } = req.user as { userId: string };
    await expensesService.deleteReminder(userId, req.params.reminderId as string);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

router.get('/', validate(listExpensesSchema, 'query'), async (req, res, next) => {
  try {
    const { userId } = req.user as { userId: string };
    res.json(await expensesService.listExpenses(userId, req.query as unknown as ListExpensesParams));
  } catch (err) {
    next(err);
  }
});

router.post('/', validate(createPersonalExpenseSchema), async (req, res, next) => {
  try {
    const { userId } = req.user as { userId: string };
    res.status(201).json(await expensesService.createExpense(userId, req.body));
  } catch (err) {
    next(err);
  }
});

router.patch(
  '/:expenseId',
  validate(idParamsSchema('expenseId'), 'params'),
  validate(updatePersonalExpenseSchema),
  async (req, res, next) => {
    try {
      const { userId } = req.user as { userId: string };
      res.json(await expensesService.updateExpense(userId, req.params.expenseId as string, req.body));
    } catch (err) {
      next(err);
    }
  }
);

router.delete('/:expenseId', validate(idParamsSchema('expenseId'), 'params'), async (req, res, next) => {
  try {
    const { userId } = req.user as { userId: string };
    await expensesService.deleteExpense(userId, req.params.expenseId as string);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
