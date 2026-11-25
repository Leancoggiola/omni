import type {
  GatheringDetail,
  GatheringExpense,
  GatheringParticipantSummary,
  GatheringSummary,
  SplitFriendWithBalance,
} from '@omni/shared/split-expenses';

export function participant(overrides: Partial<GatheringParticipantSummary> = {}): GatheringParticipantSummary {
  return {
    id: 'p0',
    displayName: 'Ana Gómez',
    friendId: null,
    alias: null,
    totalPaid: 0,
    owed: 0,
    balance: 0,
    isSelf: false,
    ...overrides,
  };
}

export function expense(overrides: Partial<GatheringExpense> = {}): GatheringExpense {
  return {
    id: 'e1',
    participantId: 'p1',
    participantName: 'Martín',
    amount: 27000,
    description: 'Bebidas',
    sharedWith: [],
    createdAt: '2026-10-18T16:20:00.000Z',
    ...overrides,
  };
}

export const PARTICIPANTS = [
  participant({ id: 'p0', isSelf: true, totalPaid: 0, owed: 13500, balance: -13500 }),
  participant({ id: 'p1', displayName: 'Martín', totalPaid: 27000, owed: 13500, balance: 13500 }),
];

export function gatheringDetail(overrides: Partial<GatheringDetail> = {}): GatheringDetail {
  return {
    id: 'g1',
    name: 'Asado del sábado',
    date: '2026-10-18',
    isSettled: false,
    settledAt: null,
    participantCount: 2,
    totalAmount: 27000,
    participants: PARTICIPANTS,
    expenses: [expense()],
    settlements: [
      { fromParticipantId: 'p0', fromName: 'Ana Gómez', toParticipantId: 'p1', toName: 'Martín', amount: 13500 },
    ],
    myBalance: -13500,
    ...overrides,
  };
}

export function gatheringSummary(overrides: Partial<GatheringSummary> = {}): GatheringSummary {
  return {
    id: 'g1',
    name: 'Asado del sábado',
    date: '2026-10-18',
    isSettled: false,
    participantCount: 4,
    totalAmount: 96000,
    myBalance: 33750,
    lastExpense: {
      participantName: 'Martín',
      isSelf: false,
      amount: 27000,
      description: 'Bebidas',
      createdAt: '2026-10-18T16:20:00.000Z',
    },
    ...overrides,
  };
}

export function friend(overrides: Partial<SplitFriendWithBalance> = {}): SplitFriendWithBalance {
  return {
    id: 'f1',
    name: 'Martín',
    alias: 'martin.rios',
    balance: 750,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    ...overrides,
  };
}
