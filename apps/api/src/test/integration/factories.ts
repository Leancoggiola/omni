import { hash } from 'bcrypt';

import { prisma } from '../../common/db';
import type { TestJwtUser } from './auth';

/** Cheapest cost bcrypt accepts. Hashing at the production cost dominates the suite runtime. */
const TEST_BCRYPT_ROUNDS = 4;

export const TEST_PASSWORD = 'test-password-123';

let sequence = 0;

function nextId(prefix: string): string {
  sequence += 1;
  return `${prefix}-${String(sequence).padStart(4, '0')}`;
}

export function resetFactorySequence(): void {
  sequence = 0;
}

export interface CreateUserOptions {
  username?: string;
  name?: string;
  email?: string;
  password?: string;
  role?: 'USER' | 'ADMIN';
}

export async function createUser(options: CreateUserOptions = {}) {
  const id = nextId('user');
  return prisma.user.create({
    data: {
      id,
      username: options.username ?? id,
      name: options.name ?? 'Test User',
      email: options.email ?? null,
      password: await hash(options.password ?? TEST_PASSWORD, TEST_BCRYPT_ROUNDS),
      role: options.role ?? 'USER',
    },
  });
}

export function toJwtUser(user: { id: string; username: string; role: string }): TestJwtUser {
  return { userId: user.id, username: user.username, role: user.role };
}

export async function createUserPreferences(userId: string, options: { notifications?: boolean } = {}) {
  return prisma.userPreferences.create({
    data: { id: nextId('prefs'), userId, notifications: options.notifications ?? true },
  });
}

export interface CreateFriendOptions {
  name?: string;
  alias?: string | null;
}

export async function createFriend(userId: string, options: CreateFriendOptions = {}) {
  const id = nextId('friend');
  const name = options.name ?? `Friend ${id}`;
  return prisma.splitFriend.create({
    data: {
      id,
      userId,
      name,
      nameNormalized: name.trim().toLowerCase(),
      alias: options.alias ?? null,
    },
  });
}

export interface CreateGatheringOptions {
  name?: string;
  date?: Date;
  isSettled?: boolean;
  participants?: string[];
}

export async function createGathering(userId: string, options: CreateGatheringOptions = {}) {
  const id = nextId('gathering');
  return prisma.gathering.create({
    data: {
      id,
      userId,
      name: options.name ?? `Gathering ${id}`,
      date: options.date ?? new Date('2026-01-15T00:00:00.000Z'),
      isSettled: options.isSettled ?? false,
      settledAt: options.isSettled ? new Date('2026-01-20T00:00:00.000Z') : null,
      participants: options.participants
        ? { create: options.participants.map(displayName => ({ id: nextId('participant'), displayName })) }
        : undefined,
    },
    include: { participants: true },
  });
}

export interface CreateGatheringExpenseOptions {
  amount?: number;
  description?: string | null;
}

export async function createGatheringExpense(
  gatheringId: string,
  participantId: string,
  options: CreateGatheringExpenseOptions = {}
) {
  return prisma.gatheringExpense.create({
    data: {
      id: nextId('expense'),
      gatheringId,
      participantId,
      amount: options.amount ?? 1000,
      description: options.description ?? null,
    },
  });
}

export interface CreateGymPlanOptions {
  name?: string | null;
  status?: 'ACTIVE' | 'ARCHIVED';
}

export async function createGymPlan(userId: string, options: CreateGymPlanOptions = {}) {
  const id = nextId('plan');
  return prisma.gymPlan.create({
    data: {
      id,
      userId,
      name: options.name === undefined ? `Plan ${id}` : options.name,
      status: options.status ?? 'ACTIVE',
      archivedAt: options.status === 'ARCHIVED' ? new Date('2026-02-01T00:00:00.000Z') : null,
    },
  });
}

export interface CreateGymExerciseOptions {
  dayLabel?: string;
  name?: string;
  sets?: number | null;
  reps?: string;
  currentWeightKg?: number | null;
}

export async function createGymExercise(planId: string, options: CreateGymExerciseOptions = {}) {
  const label = options.dayLabel ?? 'Lunes';
  const day =
    (await prisma.gymPlanDay.findFirst({ where: { planId, label } })) ??
    (await prisma.gymPlanDay.create({ data: { id: nextId('day'), planId, label } }));

  return prisma.gymExercise.create({
    data: {
      id: nextId('exercise'),
      dayId: day.id,
      name: options.name ?? 'Sentadilla',
      sets: options.sets ?? 4,
      reps: options.reps ?? '6',
      currentWeightKg: options.currentWeightKg ?? null,
    },
  });
}

export type PantryCategoryValue =
  | 'DAIRY'
  | 'MEAT'
  | 'FRUIT'
  | 'VEGETABLE'
  | 'GRAINS'
  | 'BEVERAGES'
  | 'SNACKS'
  | 'CONDIMENTS'
  | 'FROZEN'
  | 'CLEANING';

export interface CreatePantryProductOptions {
  name?: string;
  category?: PantryCategoryValue;
  unit?: 'UNITS' | 'PACKAGES';
  quantity?: number;
  minQuantity?: number | null;
  expiresAt?: Date | null;
}

export async function createPantryProduct(userId: string, options: CreatePantryProductOptions = {}) {
  const id = nextId('product');
  const name = options.name ?? `Producto ${id}`;
  return prisma.pantryProduct.create({
    data: {
      id,
      userId,
      name,
      nameNormalized: name.trim().toLowerCase(),
      category: options.category ?? 'GRAINS',
      unit: options.unit ?? 'UNITS',
      quantity: options.quantity ?? 5,
      minQuantity: options.minQuantity ?? null,
      expiresAt: options.expiresAt ?? null,
    },
  });
}

export interface CreateShoppingListItemOptions {
  name?: string;
  pantryProductId?: string | null;
  source?: 'AUTO' | 'MANUAL';
  quantityToBuy?: number;
  unit?: 'UNITS' | 'PACKAGES';
  checked?: boolean;
}

export async function createShoppingListItem(userId: string, options: CreateShoppingListItemOptions = {}) {
  const id = nextId('item');
  return prisma.pantryShoppingListItem.create({
    data: {
      id,
      userId,
      name: options.name ?? `Item ${id}`,
      pantryProductId: options.pantryProductId ?? null,
      source: options.source ?? 'MANUAL',
      quantityToBuy: options.quantityToBuy ?? 1,
      unit: options.unit ?? 'UNITS',
      checked: options.checked ?? false,
    },
  });
}

export type ExpenseCategoryValue =
  | 'FOOD'
  | 'TRANSPORT'
  | 'ENTERTAINMENT'
  | 'HEALTH'
  | 'EDUCATION'
  | 'HOME'
  | 'SERVICES'
  | 'OTHER';

export interface CreatePersonalExpenseOptions {
  concept?: string;
  amount?: number;
  category?: ExpenseCategoryValue;
  date?: Date;
  notes?: string | null;
}

export async function createPersonalExpense(userId: string, options: CreatePersonalExpenseOptions = {}) {
  const id = nextId('expense');
  return prisma.personalExpense.create({
    data: {
      id,
      userId,
      concept: options.concept ?? `Gasto ${id}`,
      amount: options.amount ?? 1000,
      category: options.category ?? 'FOOD',
      date: options.date ?? new Date('2026-08-02T00:00:00.000Z'),
      notes: options.notes ?? null,
    },
  });
}

export interface CreateExpenseReminderOptions {
  title?: string;
  dueDate?: Date;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';
  recurrence?: 'ONCE' | 'MONTHLY';
  status?: 'PENDING' | 'COMPLETED';
}

export async function createExpenseReminder(userId: string, options: CreateExpenseReminderOptions = {}) {
  const id = nextId('reminder');
  return prisma.expenseReminder.create({
    data: {
      id,
      userId,
      title: options.title ?? `Recordatorio ${id}`,
      dueDate: options.dueDate ?? new Date('2026-08-05T00:00:00.000Z'),
      priority: options.priority ?? 'MEDIUM',
      recurrence: options.recurrence ?? 'MONTHLY',
      status: options.status ?? 'PENDING',
    },
  });
}
