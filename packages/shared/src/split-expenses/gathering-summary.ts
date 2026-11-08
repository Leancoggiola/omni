import { roundMoney } from '../common/money';
import {
  computeBalances,
  computeSettlements,
  type ParticipantBalance,
  type SettlementExpenseInput,
  type SettlementParticipantInput,
} from './settlements';
import type { Settlement, SplitBalanceSummary } from './types';

export interface GatheringSettlementSummary {
  totalAmount: number;
  balances: ParticipantBalance[];
  settlements: Settlement[];
}

/** Total de la juntada, saldo de cada participante y las transferencias que los cancelan. */
export function summarizeGatheringPayments(
  participants: SettlementParticipantInput[],
  expenses: SettlementExpenseInput[]
): GatheringSettlementSummary {
  const balances = computeBalances(participants, expenses);
  return {
    totalAmount: roundMoney(expenses.reduce((sum, expense) => sum + expense.amount, 0)),
    balances,
    settlements: computeSettlements(balances),
  };
}

/**
 * Saldo del participante propio en una juntada: lo que pagó menos lo que gastó (positivo = le deben, negativo = debe).
 * Es `null` cuando no hay participante propio (`selfParticipantId` nulo, como en las juntadas anteriores a "Vos") o
 * no está entre `participants`.
 */
export function summarizeUserBalance(
  participants: SettlementParticipantInput[],
  expenses: SettlementExpenseInput[],
  selfParticipantId: string | null
): number | null {
  if (selfParticipantId === null) return null;
  const self = computeBalances(participants, expenses).find(participant => participant.id === selfParticipantId);
  return self ? self.balance : null;
}

/**
 * Resume los saldos propios (`summarizeUserBalance`) de varias juntadas: `owedToYou` suma los positivos,
 * `youOwe` suma los negativos en positivo y `net` es la diferencia. Los `null` (juntadas sin participante propio)
 * no suman ni cuentan en `gatheringCount`.
 */
export function summarizeSplitBalance(balances: Array<number | null>): SplitBalanceSummary {
  let owedToYou = 0;
  let youOwe = 0;
  let gatheringCount = 0;

  for (const balance of balances) {
    if (balance === null) continue;
    gatheringCount += 1;
    if (balance > 0) owedToYou += balance;
    else if (balance < 0) youOwe -= balance;
  }

  owedToYou = roundMoney(owedToYou);
  youOwe = roundMoney(youOwe);
  return { owedToYou, youOwe, net: roundMoney(owedToYou - youOwe), gatheringCount };
}
