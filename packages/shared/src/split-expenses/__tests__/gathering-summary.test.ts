import { describe, expect, it } from 'vitest';

import { summarizeGatheringPayments } from '..';

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
