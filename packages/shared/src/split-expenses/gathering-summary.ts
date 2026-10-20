import { roundMoney } from '../common/money';
import { computeBalances, computeSettlements, type SettlementParticipantInput } from './settlements';
import type { Settlement } from './types';

export interface GatheringSettlementSummary {
  totalAmount: number;
  fairShare: number;
  settlements: Settlement[];
  hasDebts: boolean;
}

export function summarizeGatheringPayments(participants: SettlementParticipantInput[]): GatheringSettlementSummary {
  const totalAmount = roundMoney(participants.reduce((sum, p) => sum + p.totalPaid, 0));
  const fairShare = participants.length > 0 ? roundMoney(totalAmount / participants.length) : 0;
  const settlements = computeSettlements(computeBalances(participants, fairShare));
  return {
    totalAmount,
    fairShare,
    settlements,
    hasDebts: settlements.length > 0,
  };
}
