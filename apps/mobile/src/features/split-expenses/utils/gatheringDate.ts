import { appDateKey } from '@omni/shared/common';

export type DateChoice = 'today' | 'yesterday' | 'other';

export const INVALID_DATE_MESSAGE = 'Ingresá una fecha válida';
export const FUTURE_DATE_MESSAGE = 'La fecha no puede ser futura';

const DAY_MS = 86_400_000;
const MIN_YEAR = 1900;

export type OtherDateResult = { date: string; error?: never } | { date?: never; error: string };

/** Día de "Hoy" o de "Ayer" como `YYYY-MM-DD`, en la zona horaria de la app. */
export function relativeDateKey(choice: 'today' | 'yesterday', now: Date = new Date()): string {
  return appDateKey(choice === 'today' ? now : new Date(now.getTime() - DAY_MS));
}

/** Pasa lo que escribe la persona a `dd/mm/aaaa`: solo dígitos (hasta 8) con las barras puestas solas. */
export function maskDateInput(text: string): string {
  const digits = text.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/** Fecha de "Otra" (`dd/mm/aaaa`) como `YYYY-MM-DD`: tiene que ser un día real, desde 1900 y no futuro. */
export function parseOtherDate(display: string, now: Date = new Date()): OtherDateResult {
  const match = display.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return { error: INVALID_DATE_MESSAGE };
  const [day, month, year] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  const isRealDate = date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  if (!isRealDate || year < MIN_YEAR) return { error: INVALID_DATE_MESSAGE };
  const key = `${match[3]}-${match[2]}-${match[1]}`;
  return key > appDateKey(now) ? { error: FUTURE_DATE_MESSAGE } : { date: key };
}
