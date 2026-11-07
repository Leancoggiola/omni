import { describe, expect, it } from 'vitest';

import { summarizeGatheringPayments, summarizeSplitBalance, summarizeUserBalance } from '..';

describe('summarizeUserBalance', () => {
  const participants = [
    { id: 'marco', displayName: 'Marco', totalPaid: 600 },
    { id: 'lean', displayName: 'Lean', totalPaid: 8000 },
  ];

  it('es positivo cuando el participante propio pagó de más', () => {
    expect(summarizeUserBalance(participants, 'lean')).toBe(3700);
  });

  it('es negativo cuando el participante propio pagó de menos', () => {
    expect(summarizeUserBalance(participants, 'marco')).toBe(-3700);
  });

  it('coincide con la liquidación de summarizeGatheringPayments', () => {
    const [settlement] = summarizeGatheringPayments(participants).settlements;

    expect(summarizeUserBalance(participants, settlement!.fromParticipantId)).toBe(-settlement!.amount);
    expect(summarizeUserBalance(participants, settlement!.toParticipantId)).toBe(settlement!.amount);
  });

  it('es 0 cuando todos pagaron lo mismo', () => {
    const even = [
      { id: 'a', displayName: 'A', totalPaid: 100 },
      { id: 'b', displayName: 'B', totalPaid: 100 },
    ];

    expect(summarizeUserBalance(even, 'a')).toBe(0);
  });

  it('redondea la parte y el saldo a centavos', () => {
    const uneven = [
      { id: 'a', displayName: 'A', totalPaid: 100 },
      { id: 'b', displayName: 'B', totalPaid: 0 },
      { id: 'c', displayName: 'C', totalPaid: 0 },
    ];

    expect(summarizeUserBalance(uneven, 'a')).toBe(66.67);
    expect(summarizeUserBalance(uneven, 'b')).toBe(-33.33);
  });

  it('es null sin participante propio', () => {
    expect(summarizeUserBalance(participants, null)).toBeNull();
  });

  it('es null si el participante propio no está entre los participantes', () => {
    expect(summarizeUserBalance(participants, 'otro')).toBeNull();
  });

  it('es null sin participantes', () => {
    expect(summarizeUserBalance([], 'lean')).toBeNull();
  });
});

describe('summarizeSplitBalance', () => {
  it('separa lo que te deben de lo que debés y calcula el neto', () => {
    expect(summarizeSplitBalance([3700, -1200, 500, -300])).toEqual({
      owedToYou: 4200,
      youOwe: 1500,
      net: 2700,
      gatheringCount: 4,
    });
  });

  it('el neto es negativo si debés más de lo que te deben', () => {
    expect(summarizeSplitBalance([100, -400])).toEqual({ owedToYou: 100, youOwe: 400, net: -300, gatheringCount: 2 });
  });

  it('ignora las juntadas sin participante propio (null)', () => {
    expect(summarizeSplitBalance([null, 250, null, -50])).toEqual({
      owedToYou: 250,
      youOwe: 50,
      net: 200,
      gatheringCount: 2,
    });
  });

  it('cuenta las juntadas en 0 sin sumar importes', () => {
    expect(summarizeSplitBalance([0, 0])).toEqual({ owedToYou: 0, youOwe: 0, net: 0, gatheringCount: 2 });
  });

  it('sin juntadas devuelve todo en cero', () => {
    expect(summarizeSplitBalance([])).toEqual({ owedToYou: 0, youOwe: 0, net: 0, gatheringCount: 0 });
  });

  it('redondea las sumas a centavos', () => {
    expect(summarizeSplitBalance([0.1, 0.2, -0.1, -0.2])).toEqual({
      owedToYou: 0.3,
      youOwe: 0.3,
      net: 0,
      gatheringCount: 4,
    });
  });
});

describe('summarizeGatheringPayments', () => {
  it('suma lo pagado, reparte en partes iguales y liquida al deudor con el acreedor', () => {
    const summary = summarizeGatheringPayments([
      { id: 'marco', displayName: 'Marco', totalPaid: 600 },
      { id: 'lean', displayName: 'Lean', totalPaid: 8000 },
    ]);

    expect(summary).toEqual({
      totalAmount: 8600,
      fairShare: 4300,
      settlements: [
        { fromParticipantId: 'marco', fromName: 'Marco', toParticipantId: 'lean', toName: 'Lean', amount: 3700 },
      ],
    });
  });

  it('sin participantes devuelve todo en cero', () => {
    expect(summarizeGatheringPayments([])).toEqual({ totalAmount: 0, fairShare: 0, settlements: [] });
  });

  it('si todos pagaron lo mismo no hay liquidaciones', () => {
    const summary = summarizeGatheringPayments([
      { id: 'a', displayName: 'A', totalPaid: 100 },
      { id: 'b', displayName: 'B', totalPaid: 100 },
    ]);

    expect(summary).toEqual({ totalAmount: 200, fairShare: 100, settlements: [] });
  });

  it('redondea la parte a centavos', () => {
    const summary = summarizeGatheringPayments([
      { id: 'a', displayName: 'A', totalPaid: 100 },
      { id: 'b', displayName: 'B', totalPaid: 0 },
      { id: 'c', displayName: 'C', totalPaid: 0 },
    ]);

    expect(summary.totalAmount).toBe(100);
    expect(summary.fairShare).toBe(33.33);
  });
});
