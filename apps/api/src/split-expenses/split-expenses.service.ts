import type {
  AddGatheringExpensePayload,
  CreateGatheringPayload,
  CreateSplitFriendPayload,
  GatheringDetail,
  GatheringSummary,
  ListGatheringsParams,
  SplitFriend,
  SplitFriendSuggest,
  SuggestSplitFriendsParams,
  ToggleGatheringSettledPayload,
  UpdateSplitFriendPayload,
} from '@omni/shared/split-expenses';
import { summarizeGatheringPayments } from '@omni/shared/split-expenses';
import { parseIsoDateString, paginationSkipTake } from '@omni/shared/common';
import type {
  GatheringExpense as PrismaGatheringExpense,
  SplitFriend as PrismaSplitFriend,
} from '../generated/prisma/client';

import { prisma } from '../common/db';
import { decimalToNumber, normalizeName, toIsoDateString, toIsoDateTimeString } from '../common/utils/lifestyle';

function mapFriend(row: Pick<PrismaSplitFriend, 'id' | 'name' | 'alias' | 'createdAt' | 'updatedAt'>): SplitFriend {
  return {
    id: row.id,
    name: row.name,
    alias: row.alias,
    createdAt: toIsoDateTimeString(row.createdAt),
    updatedAt: toIsoDateTimeString(row.updatedAt),
  };
}

function mapFriendSuggest(row: Pick<PrismaSplitFriend, 'id' | 'name' | 'alias'>): SplitFriendSuggest {
  return { id: row.id, name: row.name, alias: row.alias };
}

function assertGatheringEditable(gathering: { isSettled: boolean }) {
  if (gathering.isSettled) {
    throw { status: 409, message: 'La juntada está saldada' };
  }
}

async function buildGatheringDetail(userId: string, gatheringId: string): Promise<GatheringDetail> {
  const gathering = await prisma.gathering.findFirst({
    where: { id: gatheringId, userId },
    include: {
      participants: {
        include: {
          friend: true,
          expenses: true,
        },
      },
      expenses: {
        include: { participant: true },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
  if (!gathering) throw { status: 404, message: 'Juntada no encontrada' };

  const participantById = new Map(gathering.participants.map(p => [p.id, p]));

  const participantSummaries = gathering.participants.map(p => {
    const totalPaid = p.expenses.reduce((sum, e) => sum + (decimalToNumber(e.amount) ?? 0), 0);
    return {
      id: p.id,
      displayName: p.displayName,
      totalPaid,
    };
  });

  const { totalAmount, fairShare, settlements } = summarizeGatheringPayments(participantSummaries);

  return {
    id: gathering.id,
    name: gathering.name,
    date: toIsoDateString(gathering.date),
    isSettled: gathering.isSettled,
    settledAt: gathering.settledAt ? toIsoDateTimeString(gathering.settledAt) : null,
    participantCount: participantSummaries.length,
    totalAmount,
    fairShare,
    participants: participantSummaries.map(p => {
      const source = participantById.get(p.id);
      return {
        id: p.id,
        displayName: p.displayName,
        friendId: source?.friendId ?? null,
        alias: source?.friend?.alias ?? null,
        totalPaid: p.totalPaid,
      };
    }),
    expenses: gathering.expenses.map((e: PrismaGatheringExpense & { participant: { displayName: string } }) => ({
      id: e.id,
      participantId: e.participantId,
      participantName: e.participant.displayName,
      amount: decimalToNumber(e.amount) ?? 0,
      description: e.description,
      createdAt: toIsoDateTimeString(e.createdAt),
    })),
    settlements,
  };
}

async function getOwnedFriend(userId: string, friendId: string) {
  const friend = await prisma.splitFriend.findFirst({ where: { id: friendId, userId } });
  if (!friend) throw { status: 404, message: 'Amigo no encontrado' };
  return friend;
}

export async function listFriends(userId: string): Promise<SplitFriend[]> {
  const rows = await prisma.splitFriend.findMany({
    where: { userId },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, alias: true, createdAt: true, updatedAt: true },
  });
  return rows.map(mapFriend);
}

export async function suggestFriends(userId: string, params: SuggestSplitFriendsParams): Promise<SplitFriendSuggest[]> {
  const q = normalizeName(params.q);
  const rows = await prisma.splitFriend.findMany({
    where: {
      userId,
      OR: [
        { nameNormalized: { contains: q } },
        { name: { contains: params.q.trim(), mode: 'insensitive' } },
        { alias: { contains: params.q.trim(), mode: 'insensitive' } },
      ],
    },
    take: params.limit,
    orderBy: { name: 'asc' },
    select: { id: true, name: true, alias: true },
  });
  return rows.map(mapFriendSuggest);
}

export async function createFriend(userId: string, dto: CreateSplitFriendPayload): Promise<SplitFriend> {
  const nameNormalized = normalizeName(dto.name);
  const existing = await prisma.splitFriend.findUnique({
    where: { userId_nameNormalized: { userId, nameNormalized } },
  });
  if (existing) throw { status: 409, message: 'Ya existe un amigo con ese nombre' };

  const friend = await prisma.splitFriend.create({
    data: {
      userId,
      name: dto.name.trim(),
      nameNormalized,
      alias: dto.alias?.trim() ?? null,
    },
  });
  return mapFriend(friend);
}

export async function updateFriend(
  userId: string,
  friendId: string,
  dto: UpdateSplitFriendPayload
): Promise<SplitFriend> {
  const current = await getOwnedFriend(userId, friendId);
  let nameNormalized = current.nameNormalized;
  if (dto.name && normalizeName(dto.name) !== current.nameNormalized) {
    nameNormalized = normalizeName(dto.name);
    const conflict = await prisma.splitFriend.findUnique({
      where: { userId_nameNormalized: { userId, nameNormalized } },
    });
    if (conflict && conflict.id !== friendId) {
      throw { status: 409, message: 'Ya existe un amigo con ese nombre' };
    }
  }

  const friend = await prisma.splitFriend.update({
    where: { id: friendId },
    data: {
      ...(dto.name !== undefined && { name: dto.name.trim(), nameNormalized }),
      ...(dto.alias !== undefined && { alias: dto.alias?.trim() ?? null }),
    },
  });
  return mapFriend(friend);
}

export async function deleteFriend(userId: string, friendId: string) {
  await getOwnedFriend(userId, friendId);
  await prisma.splitFriend.delete({ where: { id: friendId } });
}

export async function listGatherings(userId: string, params: ListGatheringsParams) {
  const { skip, take } = paginationSkipTake(params);
  const where = { userId };
  const [rows, total] = await Promise.all([
    prisma.gathering.findMany({
      where,
      skip,
      take,
      orderBy: [{ isSettled: 'asc' }, { date: 'desc' }, { createdAt: 'desc' }],
      include: {
        participants: { select: { id: true } },
        expenses: { select: { amount: true } },
      },
    }),
    prisma.gathering.count({ where }),
  ]);

  const items: GatheringSummary[] = rows.map(g => ({
    id: g.id,
    name: g.name,
    date: toIsoDateString(g.date),
    isSettled: g.isSettled,
    participantCount: g.participants.length,
    totalAmount: g.expenses.reduce((sum, e) => sum + (decimalToNumber(e.amount) ?? 0), 0),
  }));

  return { items, total, page: params.page, limit: params.limit };
}

export async function getGathering(userId: string, gatheringId: string) {
  return buildGatheringDetail(userId, gatheringId);
}

export async function createGathering(userId: string, dto: CreateGatheringPayload) {
  const friendIds = dto.participants.filter((p): p is { friendId: string } => 'friendId' in p).map(p => p.friendId);

  const friends = friendIds.length
    ? await prisma.splitFriend.findMany({ where: { id: { in: friendIds }, userId } })
    : [];
  const friendById = new Map(friends.map(friend => [friend.id, friend]));

  const participantsData = dto.participants.map(participant => {
    if ('friendId' in participant) {
      const friend = friendById.get(participant.friendId);
      if (!friend) throw { status: 404, message: 'Amigo no encontrado' };
      return { displayName: friend.name, friendId: friend.id };
    }
    return { displayName: participant.name.trim(), friendId: null };
  });

  const names = participantsData.map(p => p.displayName.toLowerCase());
  if (new Set(names).size !== names.length) {
    throw { status: 409, message: 'Participantes duplicados en la juntada' };
  }

  const gathering = await prisma.gathering.create({
    data: {
      userId,
      name: dto.name.trim(),
      date: parseIsoDateString(dto.date),
      participants: { create: participantsData },
    },
  });

  return buildGatheringDetail(userId, gathering.id);
}

export async function toggleGatheringSettled(userId: string, gatheringId: string, dto: ToggleGatheringSettledPayload) {
  const gathering = await prisma.gathering.findFirst({ where: { id: gatheringId, userId } });
  if (!gathering) throw { status: 404, message: 'Juntada no encontrada' };

  await prisma.gathering.update({
    where: { id: gatheringId },
    data: {
      isSettled: dto.isSettled,
      settledAt: dto.isSettled ? new Date() : null,
    },
  });

  return buildGatheringDetail(userId, gatheringId);
}

export async function deleteGathering(userId: string, gatheringId: string) {
  const gathering = await prisma.gathering.findFirst({ where: { id: gatheringId, userId } });
  if (!gathering) throw { status: 404, message: 'Juntada no encontrada' };
  await prisma.gathering.delete({ where: { id: gatheringId } });
}

export async function addGatheringExpense(userId: string, gatheringId: string, dto: AddGatheringExpensePayload) {
  const gathering = await prisma.gathering.findFirst({
    where: { id: gatheringId, userId },
    include: { participants: true },
  });
  if (!gathering) throw { status: 404, message: 'Juntada no encontrada' };
  assertGatheringEditable(gathering);

  const participant = gathering.participants.find(p => p.id === dto.participantId);
  if (!participant) throw { status: 404, message: 'Participante no encontrado en la juntada' };

  await prisma.gatheringExpense.create({
    data: {
      gatheringId,
      participantId: dto.participantId,
      amount: dto.amount,
      description: dto.description?.trim() ?? null,
    },
  });

  return buildGatheringDetail(userId, gatheringId);
}

export async function deleteGatheringExpense(userId: string, gatheringId: string, expenseId: string) {
  const expense = await prisma.gatheringExpense.findFirst({
    where: { id: expenseId, gatheringId, gathering: { userId } },
    include: { gathering: true },
  });
  if (!expense) throw { status: 404, message: 'Gasto no encontrado' };
  assertGatheringEditable(expense.gathering);
  await prisma.gatheringExpense.delete({ where: { id: expenseId } });
}
