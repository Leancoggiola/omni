import { roundMoney } from '../common/money';
import { computeBalances, computeSettlements, type SettlementParticipantInput } from './settlements';
import type { Settlement, SplitBalanceSummary } from './types';

export interface GatheringSettlementSummary {
  totalAmount: number;
  fairShare: number;
  settlements: Settlement[];
}

function computeTotalAndFairShare(participants: SettlementParticipantInput[]) {
  const totalAmount = roundMoney(participants.reduce((sum, p) => sum + p.totalPaid, 0));
  const fairShare = participants.length > 0 ? roundMoney(totalAmount / participants.length) : 0;
  return { totalAmount, fairShare };
}

export function summarizeGatheringPayments(participants: SettlementParticipantInput[]): GatheringSettlementSummary {
  const { totalAmount, fairShare } = computeTotalAndFairShare(participants);
  const settlements = computeSettlements(computeBalances(participants, fairShare));
  return {
    totalAmount,
    fairShare,
    settlements,
  };
}

/**
 * Saldo del participante propio en una juntada: lo que pagó menos su parte en partes iguales, redondeado a
 * centavos (positivo = le deben, negativo = debe). Es `null` cuando no hay participante propio
 * (`selfParticipantId` nulo, como en las juntadas anteriores a "Vos") o no está entre `participants`.
 */
export function summarizeUserBalance(
  participants: SettlementParticipantInput[],
  selfParticipantId: string | null
): number | null {
  if (selfParticipantId === null) return null;
  const { fairShare } = computeTotalAndFairShare(participants);
  const self = computeBalances(participants, fairShare).find(participant => participant.id === selfParticipantId);
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
