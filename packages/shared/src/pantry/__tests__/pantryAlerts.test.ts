import { describe, expect, it } from 'vitest';

import { isExpiringSoon, isLowStock } from '..';
import { startOfTodayInAppTz } from '../../common';

describe('pantry alerts', () => {
  it('detects low stock when quantity is at or below minimum', () => {
    expect(isLowStock(2, 2)).toBe(true);
    expect(isLowStock(3, 2)).toBe(false);
    expect(isLowStock(1, null)).toBe(false);
  });

  it('detects expiring soon within window', () => {
    const today = startOfTodayInAppTz(new Date('2026-08-02T15:00:00.000Z'));
    const inFiveDays = new Date(today);
    inFiveDays.setUTCDate(inFiveDays.getUTCDate() + 5);

    expect(isExpiringSoon(inFiveDays, today, 7)).toBe(true);
    expect(isExpiringSoon(null, today)).toBe(false);
  });
});
