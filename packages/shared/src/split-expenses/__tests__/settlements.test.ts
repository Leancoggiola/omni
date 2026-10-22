import { describe, expect, it } from 'vitest';

import { computeBalances, computeSettlements } from '..';

describe('computeSettlements', () => {
  it('settles Marco owes Lean case from design', () => {
    const participants = [
      { id: 'marco', displayName: 'Marco', totalPaid: 600 },
      { id: 'lean', displayName: 'Lean', totalPaid: 8000 },
    ];
    const balances = computeBalances(participants, 4300);
    const settlements = computeSettlements(balances);
    expect(settlements).toEqual([
      {
        fromParticipantId: 'marco',
        fromName: 'Marco',
        toParticipantId: 'lean',
        toName: 'Lean',
        amount: 3700,
      },
    ]);
  });
});
