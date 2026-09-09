import { describe, expect, it } from 'vitest';

import { friendFormSchema, toCreateFriendPayload, toUpdateFriendPayload } from '../friendForm';

describe('friendFormSchema', () => {
  it('accepts a valid friend', () => {
    expect(friendFormSchema.safeParse({ name: 'Lean', alias: 'leanco' }).success).toBe(true);
  });

  it('rejects an empty name', () => {
    expect(friendFormSchema.safeParse({ name: '   ', alias: 'leanco' }).success).toBe(false);
  });

  it('rejects an alias shorter than the minimum', () => {
    expect(friendFormSchema.safeParse({ name: 'Lean', alias: 'abc' }).success).toBe(false);
  });

  it('rejects an alias longer than the maximum', () => {
    expect(friendFormSchema.safeParse({ name: 'Lean', alias: 'a'.repeat(21) }).success).toBe(false);
  });

  it('rejects an alias with invalid characters', () => {
    expect(friendFormSchema.safeParse({ name: 'Lean', alias: 'lean co!' }).success).toBe(false);
  });

  it('accepts an alias with letters, numbers, dots, dashes and underscores', () => {
    expect(friendFormSchema.safeParse({ name: 'Lean', alias: 'lean.co_1-2' }).success).toBe(true);
  });
});

describe('toCreateFriendPayload', () => {
  it('trims the name and the alias', () => {
    expect(toCreateFriendPayload({ name: '  Lean  ', alias: '  leanco  ' })).toEqual({
      name: 'Lean',
      alias: 'leanco',
    });
  });
});

describe('toUpdateFriendPayload', () => {
  it('produces the same shape as create', () => {
    expect(toUpdateFriendPayload({ name: 'Lean', alias: 'leanco' })).toEqual({ name: 'Lean', alias: 'leanco' });
  });
});
