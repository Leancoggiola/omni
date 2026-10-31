import { describe, expect, it } from 'vitest';

import {
  HOUSEHOLD_INVITE_CODE_ALPHABET,
  HOUSEHOLD_INVITE_CODE_LENGTH,
  householdInviteCodeSchema,
  normalizeInviteCode,
} from '..';

describe('householdInviteCodeSchema', () => {
  it('accepts a code with the expected length and alphabet', () => {
    const code = HOUSEHOLD_INVITE_CODE_ALPHABET.slice(0, HOUSEHOLD_INVITE_CODE_LENGTH);
    expect(householdInviteCodeSchema.parse({ code })).toEqual({ code });
  });

  it('normalizes case, spaces and dashes', () => {
    expect(normalizeInviteCode(' abcd-efgh ')).toBe('ABCDEFGH');
    expect(householdInviteCodeSchema.parse({ code: 'abcd-efgh' }).code).toBe('ABCDEFGH');
  });

  it('rejects wrong length and ambiguous characters', () => {
    expect(householdInviteCodeSchema.safeParse({ code: 'ABC' }).success).toBe(false);
    expect(householdInviteCodeSchema.safeParse({ code: 'ABCDEFG0' }).success).toBe(false);
    expect(householdInviteCodeSchema.safeParse({ code: 'ABCDEFGI' }).success).toBe(false);
    expect(householdInviteCodeSchema.safeParse({}).success).toBe(false);
  });
});
