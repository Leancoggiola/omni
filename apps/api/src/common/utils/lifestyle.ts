import type { Decimal } from '@prisma/client/runtime/client';

export function decimalToNumber(value: Decimal | null | undefined): number | null {
  if (value == null) return null;
  return Number(value.toString());
}

export function normalizeName(value: string): string {
  return value.trim().toLowerCase();
}

export function toIsoDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function toIsoDateTimeString(date: Date): string {
  return date.toISOString();
}
