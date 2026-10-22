import { describe, expect, it } from 'vitest';

import { addGymExerciseSchema, updateGymExerciseWeightSchema } from '..';

describe('gym schemas', () => {
  it('accepts valid exercise payload', () => {
    expect(
      addGymExerciseSchema.parse({
        planId: 'plan1',
        dayLabel: 'Dia 1',
        name: 'Press banca',
        reps: '8-12',
      })
    ).toMatchObject({ name: 'Press banca' });
  });

  it('rejects empty reps', () => {
    expect(() =>
      addGymExerciseSchema.parse({
        planId: 'plan1',
        dayLabel: 'Dia 1',
        name: 'Press',
        reps: '',
      })
    ).toThrow();
  });

  it('rejects negative weight', () => {
    expect(() => updateGymExerciseWeightSchema.parse({ weightKg: -1 })).toThrow();
  });

  it('accepts null weight', () => {
    expect(updateGymExerciseWeightSchema.parse({ weightKg: null })).toEqual({ weightKg: null });
  });
});
