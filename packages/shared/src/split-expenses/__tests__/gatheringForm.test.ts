import { describe, expect, it } from 'vitest';

import { GATHERING_PARTICIPANTS_MAX } from '../../common/limits';

import { createInitialNewGatheringValues, newGatheringFormSchema, toCreateGatheringPayload } from '..';

import type { NewGatheringFormValues } from '..';

describe('createInitialNewGatheringValues', () => {
  it('starts empty with today as the date', () => {
    const values = createInitialNewGatheringValues();
    expect(values.name).toBe('');
    expect(values.participants).toEqual([]);
    expect(values.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('newGatheringFormSchema', () => {
  const base: NewGatheringFormValues = {
    name: 'Asado',
    date: '2026-08-15',
    participants: [{ key: 'a', friendId: null, displayName: 'Lean' }],
  };

  it('accepts a valid form', () => {
    expect(newGatheringFormSchema.safeParse(base).success).toBe(true);
  });

  it('rejects an empty name', () => {
    expect(newGatheringFormSchema.safeParse({ ...base, name: '  ' }).success).toBe(false);
  });

  it('rejects an invalid date', () => {
    expect(newGatheringFormSchema.safeParse({ ...base, date: '15/08/2026' }).success).toBe(false);
  });

  it('explains the participant limit in Spanish', () => {
    const participants = Array.from({ length: GATHERING_PARTICIPANTS_MAX + 1 }, (_, index) => ({
      key: `k${index}`,
      friendId: null,
      displayName: `Persona ${index}`,
    }));

    const result = newGatheringFormSchema.safeParse({ ...base, participants });

    expect(result.error?.issues[0]?.message).toBe(`Máximo ${GATHERING_PARTICIPANTS_MAX} participantes`);
  });

  it('requires at least one participant', () => {
    expect(newGatheringFormSchema.safeParse({ ...base, participants: [] }).success).toBe(false);
  });
});

describe('toCreateGatheringPayload', () => {
  it('maps friend participants to friendId and free names to name', () => {
    const payload = toCreateGatheringPayload({
      name: '  Asado  ',
      date: '2026-08-15',
      participants: [
        { key: 'a', friendId: 'friend-1', displayName: 'Lean' },
        { key: 'b', friendId: null, displayName: '  Marco  ' },
      ],
    });

    expect(payload).toEqual({
      name: 'Asado',
      date: '2026-08-15',
      participants: [{ friendId: 'friend-1' }, { name: 'Marco' }],
    });
  });
});
