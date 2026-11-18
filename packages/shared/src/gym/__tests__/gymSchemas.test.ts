import { describe, expect, it } from 'vitest';

import {
  addGymExerciseSchema,
  createGymPlanSchema,
  GYM_CATALOG_DEFAULT_LIMIT,
  GYM_CATALOG_MAX_LIMIT,
  GYM_DAY_EXERCISES_MAX,
  GYM_WEEKDAY_LABELS,
  GYM_WEEKDAYS,
  listGymWeightHistorySchema,
  reorderGymDayExercisesSchema,
  suggestGymCatalogSchema,
  updateGymDaySchema,
  updateGymExerciseSchema,
  updateGymExerciseWeightSchema,
  updateGymPlanSchema,
} from '..';

describe('gym schemas', () => {
  describe('weekdays', () => {
    it('lists the days from Monday to Sunday', () => {
      expect(GYM_WEEKDAYS).toEqual(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']);
    });

    it('has a Spanish label for every day', () => {
      expect(Object.keys(GYM_WEEKDAY_LABELS)).toEqual([...GYM_WEEKDAYS]);
      expect(GYM_WEEKDAY_LABELS.WEDNESDAY).toBe('Miércoles');
    });
  });

  describe('plans', () => {
    it('requires a name to create a plan', () => {
      expect(createGymPlanSchema.safeParse({}).success).toBe(false);
      expect(createGymPlanSchema.safeParse({ name: '   ' }).success).toBe(false);
      expect(createGymPlanSchema.parse({ name: '  Fuerza  ' })).toEqual({ name: 'Fuerza' });
    });

    it('rejects a null name', () => {
      expect(createGymPlanSchema.safeParse({ name: null }).success).toBe(false);
      expect(updateGymPlanSchema.safeParse({ name: null }).success).toBe(false);
    });

    it('requires a non-empty name to rename and rejects unknown fields', () => {
      expect(updateGymPlanSchema.parse({ name: 'Hipertrofia' })).toEqual({ name: 'Hipertrofia' });
      expect(updateGymPlanSchema.safeParse({}).success).toBe(false);
      expect(updateGymPlanSchema.safeParse({ name: '' }).success).toBe(false);
      expect(updateGymPlanSchema.safeParse({ name: 'Plan', status: 'ARCHIVED' }).success).toBe(false);
    });
  });

  describe('days', () => {
    it('accepts a known weekday', () => {
      expect(updateGymDaySchema.parse({ weekday: 'FRIDAY' })).toEqual({ weekday: 'FRIDAY' });
    });

    it('rejects a free-text label or an unknown weekday', () => {
      expect(updateGymDaySchema.safeParse({ weekday: 'Lunes' }).success).toBe(false);
      expect(updateGymDaySchema.safeParse({ weekday: 'monday' }).success).toBe(false);
      expect(updateGymDaySchema.safeParse({ label: 'Lunes' }).success).toBe(false);
    });
  });

  describe('reorder', () => {
    it('accepts the full list of ids', () => {
      expect(reorderGymDayExercisesSchema.parse({ exerciseIds: ['a', 'b'] })).toEqual({ exerciseIds: ['a', 'b'] });
    });

    it('rejects an empty list, repeated ids and lists over the limit', () => {
      expect(reorderGymDayExercisesSchema.safeParse({ exerciseIds: [] }).success).toBe(false);
      expect(reorderGymDayExercisesSchema.safeParse({ exerciseIds: ['a', 'a'] }).success).toBe(false);
      const ids = (count: number) => Array.from({ length: count }, (_, index) => `e${index}`);
      expect(reorderGymDayExercisesSchema.safeParse({ exerciseIds: ids(GYM_DAY_EXERCISES_MAX) }).success).toBe(true);
      expect(reorderGymDayExercisesSchema.safeParse({ exerciseIds: ids(GYM_DAY_EXERCISES_MAX + 1) }).success).toBe(
        false
      );
    });
  });

  describe('exercises', () => {
    it('accepts valid exercise payload', () => {
      expect(
        addGymExerciseSchema.parse({
          planId: 'plan1',
          weekday: 'MONDAY',
          name: 'Press banca',
          reps: '8-12',
        })
      ).toMatchObject({ name: 'Press banca', weekday: 'MONDAY' });
    });

    it('rejects the old dayLabel instead of weekday', () => {
      expect(
        addGymExerciseSchema.safeParse({ planId: 'plan1', dayLabel: 'Lunes', name: 'Press', reps: '8' }).success
      ).toBe(false);
    });

    it('rejects empty reps', () => {
      expect(() =>
        addGymExerciseSchema.parse({
          planId: 'plan1',
          weekday: 'MONDAY',
          name: 'Press',
          reps: '',
        })
      ).toThrow();
    });

    it('accepts a move to another weekday and rejects unknown fields on update', () => {
      expect(updateGymExerciseSchema.parse({ weekday: 'SUNDAY' })).toEqual({ weekday: 'SUNDAY' });
      expect(updateGymExerciseSchema.safeParse({ dayLabel: 'Lunes' }).success).toBe(false);
    });

    it('rejects negative weight', () => {
      expect(() => updateGymExerciseWeightSchema.parse({ weightKg: -1 })).toThrow();
    });

    it('accepts null weight', () => {
      expect(updateGymExerciseWeightSchema.parse({ weightKg: null })).toEqual({ weightKg: null });
    });
  });

  describe('weight history', () => {
    it('paginates with the default page and limit', () => {
      expect(listGymWeightHistorySchema.parse({})).toEqual({ page: 1, limit: 50 });
      expect(listGymWeightHistorySchema.parse({ page: '2', limit: '10' })).toEqual({ page: 2, limit: 10 });
    });
  });

  describe('catalog', () => {
    it('lets q be omitted and applies the default limit', () => {
      expect(suggestGymCatalogSchema.parse({})).toEqual({ limit: GYM_CATALOG_DEFAULT_LIMIT });
      expect(suggestGymCatalogSchema.parse({ q: ' sent ', limit: '5' })).toEqual({ q: 'sent', limit: 5 });
    });

    it('caps the limit', () => {
      expect(suggestGymCatalogSchema.safeParse({ limit: String(GYM_CATALOG_MAX_LIMIT) }).success).toBe(true);
      expect(suggestGymCatalogSchema.safeParse({ limit: String(GYM_CATALOG_MAX_LIMIT + 1) }).success).toBe(false);
    });
  });
});
