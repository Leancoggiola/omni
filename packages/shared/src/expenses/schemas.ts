import { z } from 'zod';
import { isoDateStringSchema } from '../common/dates';
import { AMOUNT_MAX_12_2 } from '../common/limits';
import { paginationSchema } from '../common/pagination';
import {
  EXPENSE_CATEGORIES,
  EXPENSE_MONTH_REGEX,
  EXPENSE_REMINDER_PRIORITIES,
  EXPENSE_REMINDER_RECURRENCES,
  EXPENSE_REMINDER_STATUSES,
} from './constants';

export const listExpensesSchema = paginationSchema.extend({
  month: z.string().regex(EXPENSE_MONTH_REGEX, 'Mes inválido (YYYY-MM)'),
  category: z.enum(EXPENSE_CATEGORIES).optional(),
});

export type ListExpensesParams = z.infer<typeof listExpensesSchema>;

export const createPersonalExpenseSchema = z.object({
  concept: z.string().trim().min(1).max(200),
  amount: z.number().positive().max(AMOUNT_MAX_12_2),
  category: z.enum(EXPENSE_CATEGORIES),
  date: isoDateStringSchema,
  notes: z.string().trim().max(500).nullable().optional(),
});

export type CreatePersonalExpensePayload = z.infer<typeof createPersonalExpenseSchema>;

export const updatePersonalExpenseSchema = z
  .object({
    concept: z.string().trim().min(1).max(200).optional(),
    amount: z.number().positive().max(AMOUNT_MAX_12_2).optional(),
    category: z.enum(EXPENSE_CATEGORIES).optional(),
    date: isoDateStringSchema.optional(),
    notes: z.string().trim().max(500).nullable().optional(),
  })
  .strict();

export type UpdatePersonalExpensePayload = z.infer<typeof updatePersonalExpenseSchema>;

export const createExpenseReminderSchema = z.object({
  title: z.string().trim().min(1).max(120),
  dueDate: isoDateStringSchema,
  priority: z.enum(EXPENSE_REMINDER_PRIORITIES).default('MEDIUM'),
  recurrence: z.enum(EXPENSE_REMINDER_RECURRENCES),
  description: z.string().trim().max(500).nullable().optional(),
});

export type CreateExpenseReminderPayload = z.infer<typeof createExpenseReminderSchema>;

export const updateExpenseReminderSchema = z
  .object({
    title: z.string().trim().min(1).max(120).optional(),
    dueDate: isoDateStringSchema.optional(),
    priority: z.enum(EXPENSE_REMINDER_PRIORITIES).optional(),
    recurrence: z.enum(EXPENSE_REMINDER_RECURRENCES).optional(),
    description: z.string().trim().max(500).nullable().optional(),
  })
  .strict();

export type UpdateExpenseReminderPayload = z.infer<typeof updateExpenseReminderSchema>;

export const completeExpenseReminderSchema = z.object({
  amount: z.number().positive().max(AMOUNT_MAX_12_2),
  category: z.enum(EXPENSE_CATEGORIES),
  expenseDate: isoDateStringSchema.optional(),
});

export type CompleteExpenseReminderPayload = z.infer<typeof completeExpenseReminderSchema>;

export const snoozeExpenseReminderSchema = z
  .object({
    days: z.number().int().positive().max(90).optional(),
    until: isoDateStringSchema.optional(),
  })
  .strict()
  .refine(data => (data.days != null) !== (data.until != null), {
    message: 'Indicá days o until, no ambos',
  });

export type SnoozeExpenseReminderPayload = z.infer<typeof snoozeExpenseReminderSchema>;

export const listRemindersSchema = z.object({
  status: z.enum(EXPENSE_REMINDER_STATUSES).optional(),
});

export type ListRemindersParams = z.infer<typeof listRemindersSchema>;
