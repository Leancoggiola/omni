import { formatMoney, MONEY_SCALE } from '../common/money';
import type {
  GatheringExpense,
  GatheringParticipantSummary,
  GatheringSummary,
  Settlement,
  SplitBalanceSummary,
} from './types';

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

export interface SplitCaption {
  text: string;
  invalid: boolean;
}

const WEEKDAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'] as const;

const MONTH_NAMES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
] as const;

function pad(value: number): string {
  return String(value).padStart(2, '0');
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

/** "Sábado 18/10" para la cabecera de una juntada, a partir de su fecha de calendario (`YYYY-MM-DD`). */
export function formatGatheringWeekday(isoDate: string): string {
  const [year = 0, month = 1, day = 1] = isoDate.split('-').map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return `${WEEKDAY_NAMES[weekday]} ${formatGatheringShortDate(isoDate)}`;
}

/** "18/10" para la lista de juntadas. */
export function formatGatheringShortDate(isoDate: string): string {
  const [, month = '', day = ''] = isoDate.split('-');
  return `${day}/${month}`;
}

/** Hora local de un gasto, `HH:mm`. */
export function formatExpenseTime(createdAt: string): string {
  const date = new Date(createdAt);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * Agrupa los gastos por día de carga en hora local (más viejo primero, como un chat). La etiqueta es "Sábado 18" y
 * suma el mes ("Sábado 18 de octubre") cuando no es el mes en curso.
 */
export function groupExpensesByDay(expenses: GatheringExpense[], now: Date = new Date()): ExpenseDayGroup[] {
  const sorted = [...expenses].sort(
    (left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
  );
  const groups: ExpenseDayGroup[] = [];

  for (const expense of sorted) {
    const date = new Date(expense.createdAt);
    const key = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    const last = groups[groups.length - 1];
    if (last?.key === key) {
      last.expenses.push(expense);
      continue;
    }
    const sameMonth = date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
    const day = `${WEEKDAY_NAMES[date.getDay()]} ${date.getDate()}`;
    groups.push({
      key,
      label: sameMonth ? day : `${day} de ${MONTH_NAMES[date.getMonth()]}`,
      expenses: [expense],
    });
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

/**
 * Parte base de cada persona al repartir `amount` entre `count`: se trunca al centavo. El centavo que sobra lo
 * absorben los primeros por id (ver `computeBalances`), así que acá no se menciona.
 */
export function baseSharePerPerson(amount: number, count: number): number {
  if (count <= 0 || !Number.isFinite(amount) || amount <= 0) return 0;
  return Math.floor(Math.round(amount * MONEY_SCALE) / count) / MONEY_SCALE;
}

/**
 * Línea en vivo de un alta de gasto: "Se divide entre 3 de 4 · $9.000,00 c/u" (sin "c/u" mientras no hay monto) o, con
 * nadie elegido, "Elegí al menos una persona" como error (`invalid: true`, no se puede agregar el gasto).
 */
export function describeSplitCaption(amount: number, selectedCount: number, totalCount: number): SplitCaption {
  if (selectedCount === 0) return { text: 'Elegí al menos una persona', invalid: true };
  const each = baseSharePerPerson(amount, selectedCount);
  const base = `Se divide entre ${selectedCount} de ${totalCount}`;
  return { text: each > 0 ? `${base} · ${formatMoney(each)} c/u` : base, invalid: false };
}

/** Participantes entre quienes se reparte un gasto parcial, en el orden de la juntada. `[]` si es entre todos. */
export function expenseSharers(
  expense: Pick<GatheringExpense, 'sharedWith'>,
  participants: GatheringParticipantSummary[]
): GatheringParticipantSummary[] {
  if (expense.sharedWith.length === 0) return [];
  return participants.filter(participant => expense.sharedWith.includes(participant.id));
}

/** "vos, Martín y Sofía": el propio va en minúscula, como en el diseño. */
function joinNames(participants: GatheringParticipantSummary[]): string {
  const names = participants.map(participant => (participant.isSelf ? 'vos' : participant.displayName));
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`;
}

/** Entre quiénes se divide un gasto parcial: "Entre vos, Martín y Sofía". `null` si se reparte entre todos. */
export function describeSharerNames(
  expense: Pick<GatheringExpense, 'sharedWith'>,
  participants: GatheringParticipantSummary[]
): string | null {
  const sharers = expenseSharers(expense, participants);
  return sharers.length === 0 ? null : `Entre ${joinNames(sharers)}`;
}

/** Línea de un gasto parcial: "Entre vos, Martín y Sofía · $9.000,00 c/u". `null` si se reparte entre todos. */
export function describeExpenseSharers(
  expense: Pick<GatheringExpense, 'amount' | 'sharedWith'>,
  participants: GatheringParticipantSummary[]
): string | null {
  const names = describeSharerNames(expense, participants);
  if (names === null) return null;
  const count = expenseSharers(expense, participants).length;
  return `${names} · ${formatMoney(baseSharePerPerson(expense.amount, count))} c/u`;
}
