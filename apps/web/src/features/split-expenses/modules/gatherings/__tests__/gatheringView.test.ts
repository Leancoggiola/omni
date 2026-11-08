import { describe, expect, it } from 'vitest';

import {
  describeBalanceSummary,
  describeMyBalance,
  describeSettlement,
  formatSignedBalance,
  groupExpensesByDay,
  participantLabel,
  participantTones,
  splitGatheringsByStatus,
} from '../utils/gatheringView';

import type { GatheringExpense, GatheringParticipantSummary, GatheringSummary } from '@omni/shared/split-expenses';

const participant = (id: string, displayName: string, isSelf = false): GatheringParticipantSummary => ({
  id,
  displayName,
  friendId: null,
  alias: null,
  totalPaid: 0,
  owed: 0,
  balance: 0,
  isSelf,
});

const expense = (id: string, createdAt: string): GatheringExpense => ({
  id,
  participantId: 'p1',
  participantName: 'Ana',
  amount: 10,
  description: null,
  sharedWith: [],
  createdAt,
});

describe('describeMyBalance', () => {
  it('positivo es "Te deben" en tono éxito', () => {
    expect(describeMyBalance(24000)).toEqual({ label: 'Te deben $24.000,00', tone: 'success' });
  });

  it('negativo es "Debés" en tono acento', () => {
    expect(describeMyBalance(-12500)).toEqual({ label: 'Debés $12.500,00', tone: 'accent' });
  });

  it('cero es "Estás al día"', () => {
    expect(describeMyBalance(0)).toEqual({ label: 'Estás al día', tone: 'dimmed' });
  });

  it('null (juntada anterior a "Vos") es "Sin saldo propio"', () => {
    expect(describeMyBalance(null)).toEqual({ label: 'Sin saldo propio', tone: 'dimmed' });
  });
});

describe('describeBalanceSummary', () => {
  it('suma lo que te deben y lo que debés', () => {
    expect(describeBalanceSummary({ owedToYou: 24000, youOwe: 12500, net: 11500, gatheringCount: 2 })).toBe(
      'Te deben $24.000,00 · debés $12.500,00'
    );
  });

  it('muestra solo la parte que aplica', () => {
    expect(describeBalanceSummary({ owedToYou: 0, youOwe: 500, net: -500, gatheringCount: 1 })).toBe('Debés $500,00');
    expect(describeBalanceSummary({ owedToYou: 500, youOwe: 0, net: 500, gatheringCount: 1 })).toBe('Te deben $500,00');
  });

  it('sin saldos está al día', () => {
    expect(describeBalanceSummary({ owedToYou: 0, youOwe: 0, net: 0, gatheringCount: 0 })).toBe('Estás al día');
  });
});

describe('formatSignedBalance', () => {
  it('usa + y − según el signo', () => {
    expect(formatSignedBalance(36000)).toEqual({ label: '+$36.000,00', tone: 'success' });
    expect(formatSignedBalance(-16000)).toEqual({ label: '−$16.000,00', tone: 'accent' });
    expect(formatSignedBalance(0)).toEqual({ label: '$0,00', tone: 'dimmed' });
  });
});

describe('participantLabel y participantTones', () => {
  it('el propio es "Vos" y el resto conserva su nombre', () => {
    expect(participantLabel(participant('p0', 'Leandro', true))).toBe('Vos');
    expect(participantLabel(participant('p1', 'Ana'))).toBe('Ana');
  });

  it('el propio queda sin tono y el resto rota en orden', () => {
    const tones = participantTones([
      participant('p0', 'Leandro', true),
      participant('p1', 'Ana'),
      participant('p2', 'Beto'),
    ]);

    expect(tones.p0).toBeUndefined();
    expect(tones.p1).toBe('sage');
    expect(tones.p2).toBe('terracotta');
  });
});

describe('splitGatheringsByStatus', () => {
  it('separa activas y saldadas conservando el orden', () => {
    const items = [
      { id: 'a', isSettled: false },
      { id: 'b', isSettled: true },
      { id: 'c', isSettled: false },
    ] as GatheringSummary[];

    const { active, settled } = splitGatheringsByStatus(items);

    expect(active.map(item => item.id)).toEqual(['a', 'c']);
    expect(settled.map(item => item.id)).toEqual(['b']);
  });
});

describe('groupExpensesByDay', () => {
  const now = new Date(2026, 9, 20, 12, 0, 0);

  it('agrupa por día, del más viejo al más nuevo', () => {
    const groups = groupExpensesByDay(
      [
        expense('e3', '2026-10-19T09:00:00'),
        expense('e1', '2026-10-18T12:40:00'),
        expense('e2', '2026-10-18T13:05:00'),
      ],
      now
    );

    expect(groups.map(group => group.key)).toEqual(['2026-10-18', '2026-10-19']);
    expect(groups[0]?.expenses.map(item => item.id)).toEqual(['e1', 'e2']);
  });

  it('la etiqueta es "Domingo 18" en el mes en curso y suma el mes si no lo es', () => {
    expect(groupExpensesByDay([expense('e1', '2026-10-18T12:40:00')], now)[0]?.label).toBe('Domingo 18');
    expect(groupExpensesByDay([expense('e1', '2026-09-18T12:40:00')], now)[0]?.label).toBe('Viernes 18 de septiembre');
  });

  it('sin gastos no hay grupos', () => {
    expect(groupExpensesByDay([], now)).toEqual([]);
  });
});

describe('describeSettlement', () => {
  it('nombra "Vos" al origen propio y "vos" al destino propio', () => {
    const participants = [participant('p0', 'Leandro', true), participant('p1', 'Ana')];

    expect(
      describeSettlement(
        { fromParticipantId: 'p1', fromName: 'Ana', toParticipantId: 'p0', toName: 'Leandro', amount: 5 },
        participants
      )
    ).toEqual({ from: 'Ana', to: 'vos' });
    expect(
      describeSettlement(
        { fromParticipantId: 'p0', fromName: 'Leandro', toParticipantId: 'p1', toName: 'Ana', amount: 5 },
        participants
      )
    ).toEqual({ from: 'Vos', to: 'Ana' });
  });
});
