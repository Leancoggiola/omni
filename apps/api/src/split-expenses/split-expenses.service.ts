import type {
  AddGatheringExpensePayload,
  CreateGatheringPayload,
  CreateSplitFriendPayload,
  GatheringDetail,
  GatheringSummary,
  ListGatheringsParams,
  SettlementExpenseInput,
  SplitBalanceSummary,
  SplitFriend,
  SplitFriendSuggest,
  SplitFriendWithBalance,
  SuggestSplitFriendsParams,
  ToggleGatheringSettledPayload,
  UpdateSplitFriendPayload,
} from '@omni/shared/split-expenses';
import {
  computeBalances,
  summarizeGatheringPayments,
  summarizeSplitBalance,
  summarizeUserBalance,
} from '@omni/shared/split-expenses';
import { parseIsoDateString, paginationSkipTake, roundMoney } from '@omni/shared/common';
import type {
  GatheringExpense as PrismaGatheringExpense,
  SplitFriend as PrismaSplitFriend,
} from '../generated/prisma/client';

import { prisma } from '../common/db';
import { decimalToNumber, normalizeName, toIsoDateString, toIsoDateTimeString } from '../common/utils/lifestyle';
import { HttpError } from '../common/http';

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
    throw new HttpError(409, 'La juntada está saldada');
  }
}

const EXPENSE_SPLIT_SELECT = {
  participantId: true,
  amount: true,
  shares: { select: { participantId: true } },
} as const;

type ExpenseSplitRow = Pick<PrismaGatheringExpense, 'participantId' | 'amount'> & {
  shares: Array<{ participantId: string }>;
};

/** Gastos de una juntada como entrada del cálculo de saldos: `sharedWith` vacío significa que se divide entre todos. */
function toSplitExpenses(rows: ExpenseSplitRow[]): SettlementExpenseInput[] {
  return rows.map(row => ({
    participantId: row.participantId,
    amount: decimalToNumber(row.amount) ?? 0,
    sharedWith: row.shares.map(share => share.participantId),
  }));
}

/** Id del participante propio ("Vos") de una juntada, o `null` si es anterior a "Vos" y no lo tiene. */
function findSelfParticipantId(participants: Array<{ id: string; isSelf: boolean }>): string | null {
  return participants.find(participant => participant.isSelf)?.id ?? null;
}

/**
 * Juntadas activas (no saldadas) del usuario con sus participantes y sus gastos, listos para calcular saldos. Trae las
 * filas en vez de agregar en SQL porque cada gasto se reparte en centavos con asignación del resto: un `SUM` no alcanza.
 * El costo queda acotado a las juntadas sin saldar.
 */
async function loadActiveGatherings(userId: string) {
  const gatherings = await prisma.gathering.findMany({
    where: { userId, isSettled: false },
    select: {
      participants: { select: { id: true, displayName: true, friendId: true, isSelf: true } },
      expenses: { select: EXPENSE_SPLIT_SELECT },
    },
  });
  return gatherings.map(gathering => ({
    participants: gathering.participants,
    expenses: toSplitExpenses(gathering.expenses),
  }));
}

/**
 * Resumen de saldo propio sobre las juntadas activas: lo que te deben, lo que debés y el neto.
 * Las juntadas sin participante propio (anteriores a "Vos") no suman.
 */
export async function getBalance(userId: string): Promise<SplitBalanceSummary> {
  const gatherings = await loadActiveGatherings(userId);
  return summarizeSplitBalance(
    gatherings.map(({ participants, expenses }) =>
      summarizeUserBalance(participants, expenses, findSelfParticipantId(participants))
    )
  );
}

/**
 * Saldo de cada amigo: suma de lo que pagó menos lo que gastó en todas las juntadas activas donde participa
 * (positivo = puso de más y el grupo le debe, negativo = debe).
 */
async function loadFriendBalances(userId: string): Promise<Map<string, number>> {
  const gatherings = await loadActiveGatherings(userId);
  const balanceByFriend = new Map<string, number>();

  for (const { participants, expenses } of gatherings) {
    const friendIdByParticipant = new Map(participants.map(participant => [participant.id, participant.friendId]));

    for (const { id, balance } of computeBalances(participants, expenses)) {
      const friendId = friendIdByParticipant.get(id);
      if (friendId) balanceByFriend.set(friendId, roundMoney((balanceByFriend.get(friendId) ?? 0) + balance));
    }
  }

  return balanceByFriend;
}

export async function getGathering(userId: string, gatheringId: string): Promise<GatheringDetail> {
  const gathering = await prisma.gathering.findFirst({
    where: { id: gatheringId, userId },
    include: {
      participants: {
        include: {
          friend: true,
        },
        orderBy: { isSelf: 'desc' },
      },
      expenses: {
        include: {
          participant: true,
          shares: { select: { participantId: true }, orderBy: { participantId: 'asc' } },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
  if (!gathering) throw new HttpError(404, 'Juntada no encontrada');

  const participantById = new Map(gathering.participants.map(p => [p.id, p]));
  const expenses = toSplitExpenses(gathering.expenses);
  const { totalAmount, balances, settlements } = summarizeGatheringPayments(gathering.participants, expenses);

  return {
    id: gathering.id,
    name: gathering.name,
    date: toIsoDateString(gathering.date),
    isSettled: gathering.isSettled,
    settledAt: gathering.settledAt ? toIsoDateTimeString(gathering.settledAt) : null,
    participantCount: balances.length,
    totalAmount,
    participants: balances.map(p => {
      const source = participantById.get(p.id);
      return {
        id: p.id,
        displayName: p.displayName,
        friendId: source?.friendId ?? null,
        alias: source?.friend?.alias ?? null,
        totalPaid: p.totalPaid,
        owed: p.owed,
        balance: p.balance,
        isSelf: source?.isSelf ?? false,
      };
    }),
    expenses: gathering.expenses.map(e => ({
      id: e.id,
      participantId: e.participantId,
      participantName: e.participant.displayName,
      amount: decimalToNumber(e.amount) ?? 0,
      description: e.description,
      sharedWith: e.shares.map(share => share.participantId),
      createdAt: toIsoDateTimeString(e.createdAt),
    })),
    settlements,
    myBalance: summarizeUserBalance(gathering.participants, expenses, findSelfParticipantId(gathering.participants)),
  };
}

async function getOwnedFriend(userId: string, friendId: string) {
  const friend = await prisma.splitFriend.findFirst({ where: { id: friendId, userId } });
  if (!friend) throw new HttpError(404, 'Amigo no encontrado');
  return friend;
}

export async function listFriends(userId: string): Promise<SplitFriendWithBalance[]> {
  const [rows, balanceByFriend] = await Promise.all([
    prisma.splitFriend.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, alias: true, createdAt: true, updatedAt: true },
    }),
    loadFriendBalances(userId),
  ]);
  return rows.map(row => ({ ...mapFriend(row), balance: balanceByFriend.get(row.id) ?? 0 }));
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
  if (existing) throw new HttpError(409, 'Ya existe un amigo con ese nombre');

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
      throw new HttpError(409, 'Ya existe un amigo con ese nombre');
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
        participants: { select: { id: true, displayName: true, isSelf: true } },
        expenses: { select: EXPENSE_SPLIT_SELECT },
      },
    }),
    prisma.gathering.count({ where }),
  ]);

  const items: GatheringSummary[] = rows.map(g => {
    const expenses = toSplitExpenses(g.expenses);
    return {
      id: g.id,
      name: g.name,
      date: toIsoDateString(g.date),
      isSettled: g.isSettled,
      participantCount: g.participants.length,
      totalAmount: roundMoney(expenses.reduce((sum, expense) => sum + expense.amount, 0)),
      myBalance: summarizeUserBalance(g.participants, expenses, findSelfParticipantId(g.participants)),
    };
  });

  return { items, total, page: params.page, limit: params.limit };
}

/**
 * Crea la juntada con el usuario como primer participante (`isSelf`, con su nombre): los participantes del payload
 * son los demás. Si alguno usa el nombre del usuario responde 409, porque ya está en la juntada.
 */
export async function createGathering(userId: string, dto: CreateGatheringPayload) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  if (!user) throw new HttpError(404, 'Usuario no encontrado');

  const friendIds = dto.participants.filter((p): p is { friendId: string } => 'friendId' in p).map(p => p.friendId);

  const friends = friendIds.length
    ? await prisma.splitFriend.findMany({ where: { id: { in: friendIds }, userId } })
    : [];
  const friendById = new Map(friends.map(friend => [friend.id, friend]));

  const participantsData = dto.participants.map(participant => {
    if ('friendId' in participant) {
      const friend = friendById.get(participant.friendId);
      if (!friend) throw new HttpError(404, 'Amigo no encontrado');
      return { displayName: friend.name, friendId: friend.id, isSelf: false };
    }
    return { displayName: participant.name.trim(), friendId: null, isSelf: false };
  });

  const names = participantsData.map(p => p.displayName.toLowerCase());
  if (new Set(names).size !== names.length) {
    throw new HttpError(409, 'Participantes duplicados en la juntada');
  }

  const selfName = user.name.trim();
  if (names.includes(selfName.toLowerCase())) {
    throw new HttpError(409, 'Ya participás en la juntada: no hace falta agregarte');
  }

  const gathering = await prisma.gathering.create({
    data: {
      userId,
      name: dto.name.trim(),
      date: parseIsoDateString(dto.date),
      participants: { create: [{ displayName: selfName, friendId: null, isSelf: true }, ...participantsData] },
    },
  });

  return getGathering(userId, gathering.id);
}

export async function toggleGatheringSettled(userId: string, gatheringId: string, dto: ToggleGatheringSettledPayload) {
  const gathering = await prisma.gathering.findFirst({ where: { id: gatheringId, userId } });
  if (!gathering) throw new HttpError(404, 'Juntada no encontrada');

  await prisma.gathering.update({
    where: { id: gatheringId },
    data: {
      isSettled: dto.isSettled,
      settledAt: dto.isSettled ? new Date() : null,
    },
  });

  return getGathering(userId, gatheringId);
}

export async function deleteGathering(userId: string, gatheringId: string) {
  const gathering = await prisma.gathering.findFirst({ where: { id: gatheringId, userId } });
  if (!gathering) throw new HttpError(404, 'Juntada no encontrada');
  await prisma.gathering.delete({ where: { id: gatheringId } });
}

/**
 * Ids a guardar como shares de un gasto. Sin `sharedWith`, o con todos los participantes, la lista queda vacía: el
 * gasto se divide entre todos los participantes actuales, así que incluye también a quien se sume después a la
 * juntada. Responde 404 si alguno no pertenece a la juntada.
 */
function resolveExpenseShares(participants: Array<{ id: string }>, sharedWith: string[] | undefined): string[] {
  if (sharedWith === undefined) return [];
  const participantIds = new Set(participants.map(participant => participant.id));
  if (sharedWith.some(id => !participantIds.has(id))) {
    throw new HttpError(404, 'Participante no encontrado en la juntada');
  }
  return sharedWith.length === participantIds.size ? [] : sharedWith;
}

export async function addGatheringExpense(userId: string, gatheringId: string, dto: AddGatheringExpensePayload) {
  const gathering = await prisma.gathering.findFirst({
    where: { id: gatheringId, userId },
    include: { participants: true },
  });
  if (!gathering) throw new HttpError(404, 'Juntada no encontrada');
  assertGatheringEditable(gathering);

  const participant = gathering.participants.find(p => p.id === dto.participantId);
  if (!participant) throw new HttpError(404, 'Participante no encontrado en la juntada');
  const shareIds = resolveExpenseShares(gathering.participants, dto.sharedWith);

  await prisma.gatheringExpense.create({
    data: {
      gatheringId,
      participantId: dto.participantId,
      amount: dto.amount,
      description: dto.description?.trim() ?? null,
      shares: { create: shareIds.map(id => ({ participantId: id })) },
    },
  });

  return getGathering(userId, gatheringId);
}

export async function deleteGatheringExpense(userId: string, gatheringId: string, expenseId: string) {
  const expense = await prisma.gatheringExpense.findFirst({
    where: { id: expenseId, gatheringId, gathering: { userId } },
    include: { gathering: true },
  });
  if (!expense) throw new HttpError(404, 'Gasto no encontrado');
  assertGatheringEditable(expense.gathering);
  await prisma.gatheringExpense.delete({ where: { id: expenseId } });
}
