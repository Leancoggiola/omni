import { dayjs } from '@/shared/dates';

import type {
  GatheringExpense,
  GatheringParticipantSummary,
  GatheringSummary,
  Settlement,
  SplitBalanceSummary,
} from '@omni/shared/split-expenses';

import { formatMoney } from '@omni/shared/common';

export type ParticipantTone = 'sage' | 'terracotta' | 'brand' | 'gray';

const PARTICIPANT_TONES: readonly ParticipantTone[] = ['sage', 'terracotta', 'brand', 'gray'];

export type BalanceTone = 'success' | 'accent' | 'dimmed';

export interface BalanceView {
  label: string;
  tone: BalanceTone;
}

export interface ExpenseDayGroup {
  key: string;
  label: string;
  expenses: GatheringExpense[];
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** Nombre a mostrar de un participante: el propio es siempre "Vos". */
export function participantLabel(participant: Pick<GatheringParticipantSummary, 'displayName' | 'isSelf'>): string {
  return participant.isSelf ? 'Vos' : participant.displayName;
}

/**
 * Tono de avatar por participante, estable según su orden en la juntada. El propio queda en `undefined` (avatar de
 * marca) y el resto rota por `PARTICIPANT_TONES`.
 */
export function participantTones(
  participants: Pick<GatheringParticipantSummary, 'id' | 'isSelf'>[]
): Record<string, ParticipantTone | undefined> {
  const tones: Record<string, ParticipantTone | undefined> = {};
  let index = 0;
  for (const participant of participants) {
    if (participant.isSelf) {
      tones[participant.id] = undefined;
      continue;
    }
    tones[participant.id] = PARTICIPANT_TONES[index % PARTICIPANT_TONES.length];
    index += 1;
  }
  return tones;
}

/** Separa las juntadas en activas y saldadas, conservando el orden recibido. */
export function splitGatheringsByStatus(items: GatheringSummary[]) {
  return {
    active: items.filter(item => !item.isSettled),
    settled: items.filter(item => item.isSettled),
  };
}

/**
 * Saldo propio de una juntada para el badge: positivo "Te deben", negativo "Debés", cero "Estás al día" y `null`
 * (juntada anterior a "Vos", sin participante propio) "Sin saldo propio".
 */
export function describeMyBalance(balance: number | null): BalanceView {
  if (balance === null) return { label: 'Sin saldo propio', tone: 'dimmed' };
  if (balance > 0) return { label: `Te deben ${formatMoney(balance)}`, tone: 'success' };
  if (balance < 0) return { label: `Debés ${formatMoney(-balance)}`, tone: 'accent' };
  return { label: 'Estás al día', tone: 'dimmed' };
}

/** Subtítulo del header: "Te deben $X · debés $Y", solo la parte que aplica, o "Estás al día" si no hay saldos. */
export function describeBalanceSummary(summary: SplitBalanceSummary): string {
  const parts: string[] = [];
  if (summary.owedToYou > 0) parts.push(`Te deben ${formatMoney(summary.owedToYou)}`);
  if (summary.youOwe > 0) parts.push(`${parts.length > 0 ? 'debés' : 'Debés'} ${formatMoney(summary.youOwe)}`);
  return parts.length > 0 ? parts.join(' · ') : 'Estás al día';
}

/** Diferencia con signo para la lista de saldos: `+$36.000,00`, `−$16.000,00`, o `$0,00` si está parejo. */
export function formatSignedBalance(balance: number): BalanceView {
  if (balance > 0) return { label: `+${formatMoney(balance)}`, tone: 'success' };
  if (balance < 0) return { label: `−${formatMoney(-balance)}`, tone: 'accent' };
  return { label: formatMoney(0), tone: 'dimmed' };
}

/** "Sábado 18/10" para la cabecera del feed. */
export function formatGatheringWeekday(isoDate: string): string {
  return capitalize(dayjs(isoDate, 'YYYY-MM-DD', true).format('dddd DD/MM'));
}

/** "18/10" para la lista de juntadas. */
export function formatGatheringShortDate(isoDate: string): string {
  return dayjs(isoDate, 'YYYY-MM-DD', true).format('DD/MM');
}

/** Hora local de un gasto, `HH:mm`. */
export function formatExpenseTime(createdAt: string): string {
  return dayjs(createdAt).format('HH:mm');
}

/**
 * Agrupa los gastos por día de carga (más viejo primero, como un chat). La etiqueta es "Sábado 18" y suma el mes
 * ("Sábado 18 de octubre") cuando no es el mes en curso.
 */
export function groupExpensesByDay(expenses: GatheringExpense[], now: Date = new Date()): ExpenseDayGroup[] {
  const sorted = [...expenses].sort(
    (left, right) => dayjs(left.createdAt).valueOf() - dayjs(right.createdAt).valueOf()
  );
  const groups: ExpenseDayGroup[] = [];

  for (const expense of sorted) {
    const day = dayjs(expense.createdAt);
    const key = day.format('YYYY-MM-DD');
    const last = groups[groups.length - 1];
    if (last?.key === key) {
      last.expenses.push(expense);
      continue;
    }
    const sameMonth = day.isSame(now, 'month');
    groups.push({ key, label: capitalize(day.format(sameMonth ? 'dddd D' : 'dddd D [de] MMMM')), expenses: [expense] });
  }

  return groups;
}

/** "Juan Pablo → vos": en el destino el propio va en minúscula, como en el diseño. */
export function describeSettlement(settlement: Settlement, participants: GatheringParticipantSummary[]) {
  const isSelf = (id: string) => participants.some(participant => participant.id === id && participant.isSelf);
  return {
    from: isSelf(settlement.fromParticipantId) ? 'Vos' : settlement.fromName,
    to: isSelf(settlement.toParticipantId) ? 'vos' : settlement.toName,
  };
}
