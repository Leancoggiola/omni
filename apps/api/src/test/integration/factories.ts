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
