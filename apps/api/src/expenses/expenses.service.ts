import type {
  CompleteExpenseReminderPayload,
  CreateExpenseReminderPayload,
  CreatePersonalExpensePayload,
  ExpenseReminder,
  ExpensesSummary,
  ListExpensesParams,
  PersonalExpense,
  SnoozeExpenseReminderPayload,
  UpdateExpenseReminderPayload,
  UpdatePersonalExpensePayload,
} from '@omni/shared/expenses';
import { nextMonthlyOccurrence } from '@omni/shared/expenses';
import type {
  ExpenseReminder as PrismaExpenseReminder,
  PersonalExpense as PrismaPersonalExpense,
} from '../generated/prisma/client';
import {
  monthRange,
  parseIsoDateString,
  paginationSkipTake,
  roundMoney,
  startOfTodayInAppTz,
} from '@omni/shared/common';

import { prisma } from '../common/db';
import { decimalToNumber, toIsoDateString, toIsoDateTimeString } from '../common/utils/lifestyle';

function mapExpense(row: PrismaPersonalExpense): PersonalExpense {
  return {
    id: row.id,
    concept: row.concept,
    amount: decimalToNumber(row.amount) ?? 0,
    category: row.category,
    date: toIsoDateString(row.date),
    notes: row.notes,
    reminderId: row.reminderId,
    createdAt: toIsoDateTimeString(row.createdAt),
    updatedAt: toIsoDateTimeString(row.updatedAt),
  };
}

function reminderFlags(row: PrismaExpenseReminder, today: Date) {
  const dueTime = row.dueDate.getTime();
  const todayTime = today.getTime();
  const daysUntilDue = Math.round((dueTime - todayTime) / 86_400_000);
  return {
    isOverdue: row.status === 'PENDING' && row.dueDate < today,
    daysUntilDue,
  };
}

function mapReminder(row: PrismaExpenseReminder, today = startOfTodayInAppTz()): ExpenseReminder {
  const flags = reminderFlags(row, today);
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    dueDate: toIsoDateString(row.dueDate),
    priority: row.priority,
    recurrence: row.recurrence,
    status: row.status,
    isOverdue: flags.isOverdue,
    daysUntilDue: flags.daysUntilDue,
    createdAt: toIsoDateTimeString(row.createdAt),
    updatedAt: toIsoDateTimeString(row.updatedAt),
  };
}

const reminderChanged = () => ({ status: 409, message: 'El recordatorio cambió mientras se procesaba, reintentá' });

async function getOwnedExpense(userId: string, expenseId: string) {
  const expense = await prisma.personalExpense.findFirst({ where: { id: expenseId, userId } });
  if (!expense) throw { status: 404, message: 'Gasto no encontrado' };
  return expense;
}

async function getOwnedReminder(userId: string, reminderId: string) {
  const reminder = await prisma.expenseReminder.findFirst({ where: { id: reminderId, userId } });
  if (!reminder) throw { status: 404, message: 'Recordatorio no encontrado' };
  return reminder;
}

function buildExpenseWhere(userId: string, params: ListExpensesParams) {
  const { start, end } = monthRange(params.month);
  return {
    userId,
    date: { gte: start, lte: end },
    ...(params.category && { category: params.category }),
  };
}

export async function getSummary(userId: string, params: ListExpensesParams): Promise<ExpensesSummary> {
  const where = buildExpenseWhere(userId, params);
  const pendingWhere = { userId, status: 'PENDING' as const };

  const [totals, byCategoryRows, pendingRemindersCount, overdueRemindersCount] = await Promise.all([
    prisma.personalExpense.aggregate({ where, _sum: { amount: true }, _count: { _all: true } }),
    prisma.personalExpense.groupBy({
      by: ['category'],
      where,
      _sum: { amount: true },
      _count: { _all: true },
      orderBy: { category: 'asc' },
    }),
    prisma.expenseReminder.count({ where: pendingWhere }),
    prisma.expenseReminder.count({ where: { ...pendingWhere, dueDate: { lt: startOfTodayInAppTz() } } }),
  ]);

  return {
    totalAmount: roundMoney(decimalToNumber(totals._sum.amount) ?? 0),
    transactionCount: totals._count._all,
    pendingRemindersCount,
    overdueRemindersCount,
    activeCategoriesCount: byCategoryRows.length,
    byCategory: byCategoryRows.map(row => ({
      category: row.category,
      amount: roundMoney(decimalToNumber(row._sum.amount) ?? 0),
      count: row._count._all,
    })),
  };
}

export async function listExpenses(userId: string, params: ListExpensesParams) {
  const { skip, take } = paginationSkipTake(params);
  const where = buildExpenseWhere(userId, params);
  const [items, total] = await Promise.all([
    prisma.personalExpense.findMany({ where, skip, take, orderBy: { date: 'desc' } }),
    prisma.personalExpense.count({ where }),
  ]);
  return { items: items.map(mapExpense), total, page: params.page, limit: params.limit };
}

export async function createExpense(userId: string, dto: CreatePersonalExpensePayload) {
  const expense = await prisma.personalExpense.create({
    data: {
      userId,
      concept: dto.concept.trim(),
      amount: dto.amount,
      category: dto.category,
      date: parseIsoDateString(dto.date),
      notes: dto.notes ?? null,
    },
  });
  return mapExpense(expense);
}

export async function updateExpense(userId: string, expenseId: string, dto: UpdatePersonalExpensePayload) {
  await getOwnedExpense(userId, expenseId);
  const expense = await prisma.personalExpense.update({
    where: { id: expenseId },
    data: {
      ...(dto.concept !== undefined && { concept: dto.concept.trim() }),
      ...(dto.amount !== undefined && { amount: dto.amount }),
      ...(dto.category !== undefined && { category: dto.category }),
      ...(dto.date !== undefined && { date: parseIsoDateString(dto.date) }),
      ...(dto.notes !== undefined && { notes: dto.notes }),
    },
  });
  return mapExpense(expense);
}

export async function deleteExpense(userId: string, expenseId: string) {
  await getOwnedExpense(userId, expenseId);
  await prisma.personalExpense.delete({ where: { id: expenseId } });
}

export async function listReminders(userId: string, status?: 'PENDING' | 'COMPLETED') {
  const today = startOfTodayInAppTz();
  const items = await prisma.expenseReminder.findMany({
    where: { userId, ...(status && { status }) },
    orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
  });
  return items.map(r => mapReminder(r, today));
}

export async function createReminder(userId: string, dto: CreateExpenseReminderPayload) {
  const dueDate = parseIsoDateString(dto.dueDate);
  const reminder = await prisma.expenseReminder.create({
    data: {
      userId,
      title: dto.title.trim(),
      description: dto.description ?? null,
      dueDate,
      anchorDay: dueDate.getUTCDate(),
      priority: dto.priority ?? 'MEDIUM',
      recurrence: dto.recurrence,
    },
  });
  return mapReminder(reminder);
}

export async function updateReminder(userId: string, reminderId: string, dto: UpdateExpenseReminderPayload) {
  const current = await getOwnedReminder(userId, reminderId);
  if (current.status === 'COMPLETED') {
    throw { status: 409, message: 'No se puede editar un recordatorio completado' };
  }
  const newDueDate = dto.dueDate !== undefined ? parseIsoDateString(dto.dueDate) : undefined;
  const claimed = await prisma.expenseReminder.updateMany({
    where: {
      id: reminderId,
      userId,
      status: 'PENDING',
      ...(newDueDate && { dueDate: current.dueDate }),
    },
    data: {
      ...(dto.title !== undefined && { title: dto.title.trim() }),
      ...(newDueDate && { dueDate: newDueDate, anchorDay: newDueDate.getUTCDate() }),
      ...(dto.priority !== undefined && { priority: dto.priority }),
      ...(dto.recurrence !== undefined && { recurrence: dto.recurrence }),
      ...(dto.description !== undefined && { description: dto.description }),
    },
  });
  if (claimed.count === 0) throw reminderChanged();
  return mapReminder(await getOwnedReminder(userId, reminderId));
}

export async function deleteReminder(userId: string, reminderId: string) {
  await getOwnedReminder(userId, reminderId);
  await prisma.expenseReminder.delete({ where: { id: reminderId } });
}

export async function completeReminder(userId: string, reminderId: string, dto: CompleteExpenseReminderPayload) {
  const expenseDate = dto.expenseDate ? parseIsoDateString(dto.expenseDate) : startOfTodayInAppTz();

  const result = await prisma.$transaction(async tx => {
    const reminder = await tx.expenseReminder.findFirst({ where: { id: reminderId, userId } });
    if (!reminder) throw { status: 404, message: 'Recordatorio no encontrado' };
    if (reminder.status !== 'PENDING') {
      throw { status: 409, message: 'El recordatorio ya está completado' };
    }

    const claimed = await tx.expenseReminder.updateMany({
      where: { id: reminderId, userId, status: 'PENDING', dueDate: reminder.dueDate },
      data:
        reminder.recurrence === 'ONCE'
          ? { status: 'COMPLETED' }
          : { dueDate: nextMonthlyOccurrence(reminder.dueDate, reminder.anchorDay) },
    });
    if (claimed.count === 0) throw reminderChanged();

    const expense = await tx.personalExpense.create({
      data: {
        userId,
        concept: reminder.title,
        amount: dto.amount,
        category: dto.category,
        date: expenseDate,
        reminderId: reminder.id,
      },
    });
    const updatedReminder = await tx.expenseReminder.findUniqueOrThrow({ where: { id: reminderId } });

    return { expense, reminder: updatedReminder };
  });

  return {
    expense: mapExpense(result.expense),
    reminder: mapReminder(result.reminder),
  };
}

export async function snoozeReminder(userId: string, reminderId: string, dto: SnoozeExpenseReminderPayload) {
  const reminder = await getOwnedReminder(userId, reminderId);
  if (reminder.status !== 'PENDING') {
    throw { status: 409, message: 'Solo se pueden posponer recordatorios pendientes' };
  }

  let dueDate: Date;
  if (dto.days != null) {
    dueDate = startOfTodayInAppTz();
    dueDate.setUTCDate(dueDate.getUTCDate() + dto.days);
  } else {
    dueDate = parseIsoDateString(dto.until!);
  }

  const claimed = await prisma.expenseReminder.updateMany({
    where: { id: reminderId, userId, status: 'PENDING', dueDate: reminder.dueDate },
    data: { dueDate },
  });
  if (claimed.count === 0) throw reminderChanged();
  return mapReminder(await getOwnedReminder(userId, reminderId));
}
