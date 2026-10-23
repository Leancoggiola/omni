import { z } from 'zod';

export const APP_TIMEZONE = 'America/Argentina/Buenos_Aires';

const ISO_DATE_MIN = '1900-01-01';
const ISO_DATE_MAX = '2200-12-31';

/**
 * Fecha de calendario real: rechaza días que no existen (`2026-02-31`) en lugar de dejar que `Date.UTC` los corra, y
 * años fuera de 1900–2200, porque `Date.UTC` toma los años 0–99 como 1900–1999.
 */
export const isoDateStringSchema = z.iso
  .date('Fecha inválida (YYYY-MM-DD)')
  .refine(value => value >= ISO_DATE_MIN && value <= ISO_DATE_MAX, 'Fecha fuera de rango');

export function calendarPartsInTimeZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(date);

  const year = Number(parts.find(p => p.type === 'year')?.value);
  const month = Number(parts.find(p => p.type === 'month')?.value);
  const day = Number(parts.find(p => p.type === 'day')?.value);
  return { year, month, day };
}

/** Calendar day in APP_TIMEZONE as 'YYYY-MM-DD'. Shared key for "today" between API and clients. */
export function appDateKey(now = new Date()): string {
  const { year, month, day } = calendarPartsInTimeZone(now, APP_TIMEZONE);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** UTC Date at midnight for the calendar day in APP_TIMEZONE. Matches @db.Date comparisons. */
export function startOfTodayInAppTz(now = new Date()): Date {
  const { year, month, day } = calendarPartsInTimeZone(now, APP_TIMEZONE);
  return new Date(Date.UTC(year, month - 1, day));
}

export function parseIsoDateString(value: string): Date {
  const [yearStr, monthStr, dayStr] = value.split('-');
  return new Date(Date.UTC(Number(yearStr), Number(monthStr) - 1, Number(dayStr)));
}

export function monthRange(month: string): { start: Date; end: Date } {
  const [yearStr, monthStr] = month.split('-');
  const year = Number(yearStr);
  const monthIndex = Number(monthStr) - 1;
  const start = new Date(Date.UTC(year, monthIndex, 1));
  const end = new Date(Date.UTC(year, monthIndex + 1, 0));
  return { start, end };
}

function lastDayOfMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

/**
 * Advances a calendar date to the next month on `anchorDay`, clamping to the last day of that month when needed.
 * `anchorDay` is the day the recurrence started on (defaults to the day of `date`, i.e. "same day"): the clamp only
 * applies to the result, so 31-ene → 28-feb → 31-mar instead of dragging the clamped 28 forward. Uses UTC date
 * components (@db.Date).
 */
export function addOneMonthSameDay(date: Date, anchorDay = date.getUTCDate()): Date {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  return new Date(Date.UTC(year, month + 1, Math.min(anchorDay, lastDayOfMonth(year, month + 1))));
}

/**
 * Next due date of a monthly recurrence: the first occurrence of `anchorDay` strictly after `date`. Equals
 * `addOneMonthSameDay` unless the date was snoozed past its own occurrence (due 28-feb snoozed to 10-mar, anchor 30 →
 * 30-mar, not 30-abr).
 */
export function nextMonthlyOccurrence(date: Date, anchorDay: number): Date {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const sameMonth = new Date(Date.UTC(year, month, Math.min(anchorDay, lastDayOfMonth(year, month))));
  return sameMonth > date ? sameMonth : addOneMonthSameDay(date, anchorDay);
}
