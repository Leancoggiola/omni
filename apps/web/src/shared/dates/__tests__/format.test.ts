import { describe, expect, it } from 'vitest';

import { DISPLAY_DATE_FORMAT } from '../constants';
import {
  extractIsoDateKey,
  formatDateToIsoDateString,
  formatDateToIsoDateTime,
  formatIsoDateStringForDisplay,
  parseIsoDateStringToDate,
} from '../format';

import '@/shared/dates/dayjs';

describe('shared dates format', () => {
  const localMay15 = new Date(1990, 4, 15);

  it('formats picker date to ISO date string without UTC shift', () => {
    expect(formatDateToIsoDateString(localMay15)).toBe('1990-05-15');
  });

  it('formats picker date to ISO datetime for API', () => {
    expect(formatDateToIsoDateTime(localMay15)).toBe('1990-05-15T00:00:00.000Z');
  });

  it('displays API date as DD/MM/YYYY', () => {
    expect(formatIsoDateStringForDisplay('1990-05-15')).toBe('15/05/1990');
    expect(DISPLAY_DATE_FORMAT).toBe('DD/MM/YYYY');
  });

  it('parses API datetime to local calendar date', () => {
    expect(parseIsoDateStringToDate('1990-05-15T00:00:00.000Z')).toEqual(localMay15);
  });

  it('compares calendar days from Date and API string', () => {
    expect(extractIsoDateKey(localMay15)).toBe('1990-05-15');
    expect(extractIsoDateKey('1990-05-15T03:00:00.000Z')).toBe('1990-05-15');
  });
});
