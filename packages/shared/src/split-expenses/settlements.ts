import { roundMoney } from '../common/money';
import type { Settlement } from './types';

export interface SettlementParticipantInput {
  id: string;
  displayName: string;
  totalPaid: number;
}

export interface ParticipantBalance extends SettlementParticipantInput {
  fairShare: number;
  balance: number;
}

export function computeBalances(participants: SettlementParticipantInput[], fairShare: number): ParticipantBalance[] {
  const roundedFairShare = roundMoney(fairShare);

  return participants.map(participant => ({
    ...participant,
    fairShare: roundedFairShare,
    balance: roundMoney(participant.totalPaid - roundedFairShare),
  }));
}

export function computeSettlements(balances: ParticipantBalance[]): Settlement[] {
  const creditors = balances
    .filter(participant => participant.balance > 0)
    .map(participant => ({ ...participant }))
    .sort((left, right) => right.balance - left.balance);

  const debtors = balances
    .filter(participant => participant.balance < 0)
    .map(participant => ({
      ...participant,
      balance: roundMoney(-participant.balance),
    }))
    .sort((left, right) => right.balance - left.balance);

  const settlements: Settlement[] = [];
  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex]!;
    const creditor = creditors[creditorIndex]!;
    const amount = roundMoney(Math.min(debtor.balance, creditor.balance));

    if (amount <= 0) {
      break;
    }

    settlements.push({
      fromParticipantId: debtor.id,
      fromName: debtor.displayName,
      toParticipantId: creditor.id,
      toName: creditor.displayName,
      amount,
    });

    debtor.balance = roundMoney(debtor.balance - amount);
    creditor.balance = roundMoney(creditor.balance - amount);

    if (debtor.balance <= 0) {
      debtorIndex += 1;
    }

    if (creditor.balance <= 0) {
      creditorIndex += 1;
    }
  }

  return settlements;
}
