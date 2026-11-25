import { formatMoney } from '@omni/shared/common';
import {
  describeSettlement,
  formatExpenseTime,
  formatGatheringShortDate,
  type BalanceView,
  type GatheringDetail,
  type GatheringExpense,
  type GatheringLastExpense,
  type ParticipantTone,
} from '@omni/shared/split-expenses';

const SHORT_WEEKDAYS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'] as const;
const NAME_TONES: readonly ParticipantTone[] = ['sage', 'terracotta', 'brand'];
const DAYS_WITH_WEEKDAY = 7;
const DAY_MS = 86_400_000;

export const NO_DESCRIPTION = 'Gasto sin detalle';

/** Detalle de un gasto, o el texto que lo reemplaza cuando se cargó sin detalle. */
export function expenseTitle(expense: Pick<GatheringExpense, 'description'>): string {
  return expense.description || NO_DESCRIPTION;
}

/** Nombre del gasto para menús y confirmaciones: "Bebidas · $27.000,00". */
export function expenseSummary(expense: Pick<GatheringExpense, 'description' | 'amount'>): string {
  return `${expenseTitle(expense)} · ${formatMoney(expense.amount)}`;
}

/** "4 personas · $96.000,00"; con una sola, "Solo vos". */
export function gatheringTotals({
  participantCount,
  totalAmount,
}: Pick<GatheringDetail, 'participantCount' | 'totalAmount'>): string {
  const people = participantCount === 1 ? 'Solo vos' : `${participantCount} personas`;
  return `${people} · ${formatMoney(totalAmount)}`;
}

/** "18/10 · 4 personas · $96.000,00", la bajada de cada juntada de la lista. */
export function gatheringCaption(
  gathering: Pick<GatheringDetail, 'date' | 'participantCount' | 'totalAmount'>
): string {
  return `${formatGatheringShortDate(gathering.date)} · ${gatheringTotals(gathering)}`;
}

/** Vista previa del último gasto de una juntada: "Martín: Bebidas · $27.000,00". */
export function describeLastExpense(expense: GatheringLastExpense): string {
  const who = expense.isSelf ? 'Vos' : expense.participantName;
  return `${who}: ${expenseSummary(expense)}`;
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/** Cuándo fue el último gasto: la hora si es de hoy, el día ("lun") dentro de la última semana y si no `dd/mm`. */
export function formatLastExpenseTime(createdAt: string, now: Date = new Date()): string {
  const date = new Date(createdAt);
  const daysAgo = Math.round((startOfDay(now) - startOfDay(date)) / DAY_MS);
  if (daysAgo <= 0) return formatExpenseTime(createdAt);
  if (daysAgo < DAYS_WITH_WEEKDAY) return SHORT_WEEKDAYS[date.getDay()] ?? '';
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Tono de avatar para quien solo se conoce por el nombre (la vista previa de la lista y los amigos): estable para un
 * mismo nombre. Puede no coincidir con el del feed, que rota según el orden en la juntada (`participantTones`).
 */
export function toneForName(name: string): ParticipantTone {
  const sum = Array.from(name).reduce((total, char) => total + (char.codePointAt(0) ?? 0), 0);
  return NAME_TONES[sum % NAME_TONES.length] ?? 'sage';
}

/**
 * Saldo de un amigo en las juntadas activas. Es contra el grupo, no contra quien mira: "Le deben" si puso de más,
 * "Debe" si puso de menos y "Al día" sin diferencia.
 */
export function describeFriendBalance(balance: number): BalanceView {
  if (balance > 0) return { label: `Le deben ${formatMoney(balance)}`, tone: 'success' };
  if (balance < 0) return { label: `Debe ${formatMoney(-balance)}`, tone: 'accent' };
  return { label: 'Al día', tone: 'success' };
}

/** "3 transferencias · $34.500,00", la bajada de "Saldar cuentas". */
export function describeTransfers(settlements: GatheringDetail['settlements']): string {
  if (settlements.length === 0) return 'Nadie le debe nada a nadie.';
  const total = settlements.reduce((sum, settlement) => sum + settlement.amount, 0);
  const noun = settlements.length === 1 ? 'transferencia' : 'transferencias';
  return `${settlements.length} ${noun} · ${formatMoney(total)}`;
}

/**
 * Resumen de una juntada para compartir fuera de la app: nombre, fecha, total y las transferencias que la saldan. Usa
 * los nombres reales de todos, también el propio: lo lee otra persona.
 */
export function buildShareMessage(gathering: GatheringDetail): string {
  const others = gathering.participants.map(participant => ({ ...participant, isSelf: false }));
  const transfers = gathering.settlements.map(settlement => {
    const { from, to } = describeSettlement(settlement, others);
    return `${from} → ${to}: ${formatMoney(settlement.amount)}`;
  });
  return [
    `${gathering.name} · ${formatGatheringShortDate(gathering.date)}`,
    `${gathering.participantCount === 1 ? '1 persona' : `${gathering.participantCount} personas`} · ${formatMoney(gathering.totalAmount)}`,
    '',
    ...(transfers.length > 0 ? ['Cómo se saldan las cuentas:', ...transfers] : ['Nadie le debe nada a nadie.']),
  ].join('\n');
}
