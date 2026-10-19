import { describe, expect, it } from 'vitest';

import { addOneMonthSameDay, nextMonthlyOccurrence, roundMoney, startOfTodayInAppTz } from '@omni/shared/common';

const iso = (date: Date) => date.toISOString().slice(0, 10);
const utc = (year: number, month: number, day: number) => new Date(Date.UTC(year, month - 1, day));

describe('addOneMonthSameDay', () => {
  it('clamps Jan 31 to Feb 28 in non-leap year', () => {
    expect(iso(addOneMonthSameDay(utc(2025, 1, 31)))).toBe('2025-02-28');
  });

  it('clamps Jan 31 to Feb 29 in a leap year', () => {
    expect(iso(addOneMonthSameDay(utc(2028, 1, 31)))).toBe('2028-02-29');
  });

  it('keeps mid-month date', () => {
    expect(iso(addOneMonthSameDay(utc(2026, 8, 2)))).toBe('2026-09-02');
  });

  it('rolls over the year', () => {
    expect(iso(addOneMonthSameDay(utc(2026, 12, 15)))).toBe('2027-01-15');
  });

  it('recovers the original day after a clamped month (31-ene → 28-feb → 31-mar)', () => {
    const feb = addOneMonthSameDay(utc(2026, 1, 31), 31);
    expect(iso(feb)).toBe('2026-02-28');
    expect(iso(addOneMonthSameDay(feb, 31))).toBe('2026-03-31');
  });

  it('keeps clamping to the last day of 30-day months', () => {
    expect(iso(addOneMonthSameDay(utc(2026, 3, 31), 31))).toBe('2026-04-30');
    expect(iso(addOneMonthSameDay(utc(2026, 4, 30), 31))).toBe('2026-05-31');
  });
});

describe('nextMonthlyOccurrence', () => {
  it('matches addOneMonthSameDay when the date is on its occurrence', () => {
    expect(iso(nextMonthlyOccurrence(utc(2026, 1, 30), 30))).toBe('2026-02-28');
    expect(iso(nextMonthlyOccurrence(utc(2026, 2, 28), 30))).toBe('2026-03-30');
  });

  it('does not skip a cycle when the date was snoozed past its own occurrence', () => {
    expect(iso(nextMonthlyOccurrence(utc(2026, 3, 10), 30))).toBe('2026-03-30');
  });

  it('moves on when the date already is the anchor day of its month', () => {
    expect(iso(nextMonthlyOccurrence(utc(2026, 3, 30), 30))).toBe('2026-04-30');
  });

  it('rolls over the year', () => {
    expect(iso(nextMonthlyOccurrence(utc(2026, 12, 20), 15))).toBe('2027-01-15');
  });
});

describe('roundMoney', () => {
  it('removes float noise from sums', () => {
    expect(0.1 + 0.2).not.toBe(0.3);
    expect(roundMoney(0.1 + 0.2)).toBe(0.3);
  });

  it('keeps two decimals', () => {
    expect(roundMoney(10.456)).toBe(10.46);
    expect(roundMoney(5)).toBe(5);
  });
});

describe('startOfTodayInAppTz', () => {
  it('uses Argentina calendar day before UTC midnight', () => {
    const now = new Date('2026-08-03T02:00:00.000Z');
    const today = startOfTodayInAppTz(now);
    expect(today.toISOString().slice(0, 10)).toBe('2026-08-02');
  });

  it('rolls to next day after midnight in Argentina', () => {
    const now = new Date('2026-08-03T03:00:00.000Z');
    const today = startOfTodayInAppTz(now);
    expect(today.toISOString().slice(0, 10)).toBe('2026-08-03');
  });
});
