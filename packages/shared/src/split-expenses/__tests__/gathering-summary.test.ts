import { describe, expect, it } from 'vitest';

import { summarizeGatheringPayments, summarizeSplitBalance, summarizeUserBalance } from '..';

const person = (id: string) => ({ id, displayName: id });
const paid = (participantId: string, amount: number, sharedWith: string[] = []) => ({
  participantId,
  amount,
  sharedWith,
});

describe('summarizeUserBalance', () => {
  const participants = [
    { id: 'marco', displayName: 'Marco' },
    { id: 'lean', displayName: 'Lean' },
  ];
  const expenses = [paid('marco', 600), paid('lean', 8000)];

  it('es positivo cuando el participante propio pagó de más', () => {
    expect(summarizeUserBalance(participants, expenses, 'lean')).toBe(3700);
  });

  it('es negativo cuando el participante propio pagó de menos', () => {
    expect(summarizeUserBalance(participants, expenses, 'marco')).toBe(-3700);
  });

  it('coincide con la liquidación de summarizeGatheringPayments', () => {
    const [settlement] = summarizeGatheringPayments(participants, expenses).settlements;

    expect(summarizeUserBalance(participants, expenses, settlement!.fromParticipantId)).toBe(-settlement!.amount);
    expect(summarizeUserBalance(participants, expenses, settlement!.toParticipantId)).toBe(settlement!.amount);
  });

  it('es 0 cuando todos pagaron lo mismo', () => {
    expect(summarizeUserBalance([person('a'), person('b')], [paid('a', 100), paid('b', 100)], 'a')).toBe(0);
  });

  it('solo descuenta los gastos que el participante propio comparte', () => {
    const group = [person('a'), person('b'), person('c')];

    expect(summarizeUserBalance(group, [paid('b', 60, ['b', 'c'])], 'a')).toBe(0);
    expect(summarizeUserBalance(group, [paid('b', 60, ['b', 'c'])], 'c')).toBe(-30);
  });

  it('reparte el resto en centavos sin perderlo', () => {
    const uneven = [person('a'), person('b'), person('c')];
    const expense = [paid('a', 100)];

    expect(summarizeUserBalance(uneven, expense, 'a')).toBe(66.66);
    expect(summarizeUserBalance(uneven, expense, 'b')).toBe(-33.33);
    expect(summarizeUserBalance(uneven, expense, 'c')).toBe(-33.33);
  });

  it('es null sin participante propio', () => {
    expect(summarizeUserBalance(participants, expenses, null)).toBeNull();
  });

  it('es null si el participante propio no está entre los participantes', () => {
    expect(summarizeUserBalance(participants, expenses, 'otro')).toBeNull();
  });

  it('es null sin participantes', () => {
    expect(summarizeUserBalance([], [], 'lean')).toBeNull();
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
    const summary = summarizeGatheringPayments(
      [
        { id: 'marco', displayName: 'Marco' },
        { id: 'lean', displayName: 'Lean' },
      ],
      [paid('marco', 600), paid('lean', 8000)]
    );

    expect(summary).toEqual({
      totalAmount: 8600,
      balances: [
        { id: 'marco', displayName: 'Marco', totalPaid: 600, owed: 4300, balance: -3700 },
        { id: 'lean', displayName: 'Lean', totalPaid: 8000, owed: 4300, balance: 3700 },
      ],
      settlements: [
        { fromParticipantId: 'marco', fromName: 'Marco', toParticipantId: 'lean', toName: 'Lean', amount: 3700 },
      ],
    });
  });

  it('sin participantes devuelve todo en cero', () => {
    expect(summarizeGatheringPayments([], [])).toEqual({ totalAmount: 0, balances: [], settlements: [] });
  });

  it('si todos pagaron lo mismo no hay liquidaciones', () => {
    const summary = summarizeGatheringPayments([person('a'), person('b')], [paid('a', 100), paid('b', 100)]);

    expect(summary.totalAmount).toBe(200);
    expect(summary.settlements).toEqual([]);
  });

  it('el total no acumula error de float', () => {
    const summary = summarizeGatheringPayments([person('a')], [paid('a', 0.1), paid('a', 0.2)]);

    expect(summary.totalAmount).toBe(0.3);
  });

  it('un gasto parcial no genera deuda para quien no lo comparte', () => {
    const summary = summarizeGatheringPayments([person('a'), person('b'), person('c')], [paid('a', 90, ['a', 'b'])]);

    expect(summary.settlements).toEqual([
      { fromParticipantId: 'b', fromName: 'b', toParticipantId: 'a', toName: 'a', amount: 45 },
    ]);
  });
});
