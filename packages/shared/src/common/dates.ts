import { z } from 'zod';

export const APP_TIMEZONE = 'America/Argentina/Buenos_Aires';

export const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const isoDateStringSchema = z.string().regex(ISO_DATE_REGEX, 'Fecha inválida (YYYY-MM-DD)');

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

/**
 * Advances a calendar date by one month, clamping to the last day when needed.
 * Uses UTC date components (@db.Date).
 */
export function addOneMonthSameDay(date: Date): Date {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  const lastDayOfTargetMonth = new Date(Date.UTC(year, month + 2, 0)).getUTCDate();
  return new Date(Date.UTC(year, month + 1, Math.min(day, lastDayOfTargetMonth)));
}
