import { describe, expect, it } from 'vitest';

import { computeBalances, computeSettlements } from '..';

const person = (id: string) => ({ id, displayName: id.toUpperCase() });
const everyone = ['a', 'b', 'c'].map(person);

const sumBalances = (balances: Array<{ balance: number }>) =>
  Math.round(balances.reduce((sum, { balance }) => sum + balance * 100, 0));

describe('computeBalances', () => {
  it('reparte un gasto parcial solo entre quienes lo comparten', () => {
    const balances = computeBalances(everyone, [{ participantId: 'a', amount: 90, sharedWith: ['a', 'b'] }]);

    expect(balances).toEqual([
      { id: 'a', displayName: 'A', totalPaid: 90, owed: 45, balance: 45 },
      { id: 'b', displayName: 'B', totalPaid: 0, owed: 45, balance: -45 },
      { id: 'c', displayName: 'C', totalPaid: 0, owed: 0, balance: 0 },
    ]);
  });

  it('combina gastos de todos con gastos parciales', () => {
    const balances = computeBalances(everyone, [
      { participantId: 'a', amount: 300, sharedWith: [] },
      { participantId: 'b', amount: 60, sharedWith: ['b', 'c'] },
    ]);

    expect(balances.map(({ owed }) => owed)).toEqual([100, 130, 130]);
    expect(balances.map(({ balance }) => balance)).toEqual([200, -70, -130]);
  });

  it('el resto va de a 1 centavo a los primeros por id, sin importar el orden de entrada', () => {
    const shuffled = [person('c'), person('a'), person('b')];
    const balances = computeBalances(shuffled, [{ participantId: 'c', amount: 10000, sharedWith: [] }]);

    expect(Object.fromEntries(balances.map(({ id, owed }) => [id, owed]))).toEqual({
      a: 3333.34,
      b: 3333.33,
      c: 3333.33,
    });
    expect(sumBalances(balances)).toBe(0);
  });

  it('reparte varios centavos de resto entre los primeros', () => {
    const balances = computeBalances(everyone, [{ participantId: 'a', amount: 0.05, sharedWith: [] }]);

    expect(balances.map(({ owed }) => owed)).toEqual([0.02, 0.02, 0.01]);
    expect(sumBalances(balances)).toBe(0);
  });

  it('un pagador que no comparte el gasto queda con todo a favor y sin gasto propio', () => {
    const balances = computeBalances(everyone, [{ participantId: 'a', amount: 50, sharedWith: ['b', 'c'] }]);

    expect(balances[0]).toMatchObject({ totalPaid: 50, owed: 0, balance: 50 });
    expect(balances[1]).toMatchObject({ owed: 25, balance: -25 });
    expect(balances[2]).toMatchObject({ owed: 25, balance: -25 });
  });

  it('sharedWith vacío divide entre todos', () => {
    const balances = computeBalances(everyone, [{ participantId: 'b', amount: 30, sharedWith: [] }]);

    expect(balances.map(({ owed }) => owed)).toEqual([10, 10, 10]);
  });

  it('un participante agregado después entra en los gastos de todos, no en los parciales', () => {
    const expenses = [
      { participantId: 'a', amount: 90, sharedWith: [] },
      { participantId: 'a', amount: 20, sharedWith: ['a', 'b'] },
    ];

    const before = computeBalances(everyone, expenses);
    const after = computeBalances([...everyone, person('d')], expenses);

    expect(before.map(({ owed }) => owed)).toEqual([40, 40, 30]);
    expect(after.map(({ owed }) => owed)).toEqual([32.5, 32.5, 22.5, 22.5]);
  });

  it('ignora los ids de sharedWith que ya no están y, si no queda nadie, divide entre todos', () => {
    const partial = computeBalances(everyone, [{ participantId: 'a', amount: 40, sharedWith: ['a', 'gone'] }]);
    const allGone = computeBalances(everyone, [{ participantId: 'a', amount: 30, sharedWith: ['gone'] }]);

    expect(partial.map(({ owed }) => owed)).toEqual([40, 0, 0]);
    expect(allGone.map(({ owed }) => owed)).toEqual([10, 10, 10]);
  });

  it('los saldos siempre suman 0, aun con muchos gastos que no dividen justo', () => {
    const people = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map(person);
    const ids = people.map(({ id }) => id);
    const expenses = Array.from({ length: 200 }, (_, index) => ({
      participantId: ids[index % ids.length]!,
      amount: (index * 37 + 1) / 100 + 0.01,
      sharedWith: index % 3 === 0 ? [] : ids.filter((_, position) => (index >> position) & 1),
    }));

    const balances = computeBalances(people, expenses);

    expect(sumBalances(balances)).toBe(0);
  });

  it('sin gastos todos quedan en cero', () => {
    expect(computeBalances(everyone, []).map(({ balance }) => balance)).toEqual([0, 0, 0]);
  });
});

describe('computeSettlements', () => {
  it('settles Marco owes Lean case from design', () => {
    const participants = [
      { id: 'marco', displayName: 'Marco' },
      { id: 'lean', displayName: 'Lean' },
    ];
    const balances = computeBalances(participants, [
      { participantId: 'marco', amount: 600, sharedWith: [] },
      { participantId: 'lean', amount: 8000, sharedWith: [] },
    ]);

    expect(computeSettlements(balances)).toEqual([
      { fromParticipantId: 'marco', fromName: 'Marco', toParticipantId: 'lean', toName: 'Lean', amount: 3700 },
    ]);
  });

  it('con resto, las transferencias cancelan todos los saldos', () => {
    const balances = computeBalances(
      ['a', 'b', 'c'].map(id => ({ id, displayName: id })),
      [{ participantId: 'c', amount: 10000, sharedWith: [] }]
    );

    expect(computeSettlements(balances).map(({ amount }) => amount)).toEqual([3333.34, 3333.33]);
  });

  it('reproduce el asado del canvas', () => {
    const asado = [
      { id: 'lc', displayName: 'Vos' },
      { id: 'ma', displayName: 'Martín' },
      { id: 'sr', displayName: 'Sofía' },
      { id: 'jp', displayName: 'Juan Pablo' },
    ];
    const balances = computeBalances(asado, [
      { participantId: 'lc', amount: 60000, sharedWith: [] },
      { participantId: 'sr', amount: 9000, sharedWith: [] },
      { participantId: 'ma', amount: 27000, sharedWith: ['lc', 'ma', 'sr'] },
    ]);

    expect(balances.map(({ owed }) => owed)).toEqual([26250, 26250, 26250, 17250]);
    expect(balances.map(({ balance }) => balance)).toEqual([33750, 750, -17250, -17250]);
    expect(computeSettlements(balances).reduce((sum, { amount }) => sum + amount, 0)).toBe(34500);
  });
});
