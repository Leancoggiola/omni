import { describe, expect, it } from 'vitest';

import { formatMoney } from '..';

describe('formatMoney', () => {
  it.each([
    [13124, '$13.124,00'],
    [0, '$0,00'],
    [5.5, '$5,50'],
    [999.999, '$1.000,00'],
    [1234567.891, '$1.234.567,89'],
    [-5.5, '-$5,50'],
    [-0.001, '$0,00'],
  ])('%d → %s', (value, formatted) => {
    expect(formatMoney(value)).toBe(formatted);
  });
});
