import { MONEY_SCALE, roundMoney } from '../common/money';
import type { Settlement } from './types';

export interface SettlementParticipantInput {
  id: string;
  displayName: string;
}

export interface SettlementExpenseInput {
  participantId: string;
  amount: number;
  sharedWith: string[];
}

export interface ParticipantBalance extends SettlementParticipantInput {
  totalPaid: number;
  owed: number;
  balance: number;
}

function toCents(amount: number): number {
  return Math.round(amount * MONEY_SCALE);
}

function fromCents(cents: number): number {
  return cents / MONEY_SCALE;
}

/**
 * Reparte un importe en centavos entre participantes: todos reciben la parte entera y el resto va, de a 1 centavo,
 * a los primeros por orden de id, así la suma de las partes es exactamente el importe.
 */
function splitCents(amountCents: number, participantIds: string[]): Map<string, number> {
  const sortedIds = [...participantIds].sort();
  const baseShare = Math.floor(amountCents / sortedIds.length);
  const remainder = amountCents - baseShare * sortedIds.length;
  return new Map(sortedIds.map((id, index) => [id, baseShare + (index < remainder ? 1 : 0)]));
}

/** Quiénes comparten un gasto: los de `sharedWith` que siguen en la juntada o, si no queda ninguno, todos. */
function resolveSharers(sharedWith: string[], participantIds: string[]): string[] {
  const current = new Set(participantIds);
  const known = sharedWith.filter(id => current.has(id));
  return known.length > 0 ? known : participantIds;
}

/**
 * Lo que pagó y lo que gastó cada participante, y su saldo (`totalPaid - owed`: positivo = le deben). Cada gasto se
 * reparte en centavos entre quienes lo comparten, así que los saldos de una juntada siempre suman exactamente 0.
 */
export function computeBalances(
  participants: SettlementParticipantInput[],
  expenses: SettlementExpenseInput[]
): ParticipantBalance[] {
  const participantIds = participants.map(participant => participant.id);
  const paidCents = new Map<string, number>();
  const owedCents = new Map<string, number>();

  for (const expense of expenses) {
    const amountCents = toCents(expense.amount);
    paidCents.set(expense.participantId, (paidCents.get(expense.participantId) ?? 0) + amountCents);
    for (const [id, share] of splitCents(amountCents, resolveSharers(expense.sharedWith, participantIds))) {
      owedCents.set(id, (owedCents.get(id) ?? 0) + share);
    }
  }

  return participants.map(participant => {
    const paid = paidCents.get(participant.id) ?? 0;
    const owed = owedCents.get(participant.id) ?? 0;
    return {
      ...participant,
      totalPaid: fromCents(paid),
      owed: fromCents(owed),
      balance: fromCents(paid - owed),
    };
  });
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
