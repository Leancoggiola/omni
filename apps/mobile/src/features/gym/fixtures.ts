import type {
  GymCatalogExercise,
  GymExercise,
  GymPlanDay,
  GymPlanDetail,
  GymPlanSummary,
  GymWeightEntry,
} from '@omni/shared/gym';

export const exercise = (overrides: Partial<GymExercise> = {}): GymExercise => ({
  id: 'e1',
  catalogId: 'c1',
  name: 'Sentadilla',
  sets: 4,
  reps: '12',
  currentWeightKg: 60,
  sortOrder: 0,
  ...overrides,
});

export const day = (overrides: Partial<GymPlanDay> = {}): GymPlanDay => ({
  id: 'd1',
  weekday: 'MONDAY',
  exercises: [exercise()],
  ...overrides,
});

export const planDetail = (overrides: Partial<GymPlanDetail> = {}): GymPlanDetail => ({
  id: 'p1',
  name: 'Fuerza 3 días',
  status: 'ACTIVE',
  createdAt: '2026-11-01T00:00:00.000Z',
  archivedAt: null,
  days: [day()],
  ...overrides,
});

export const planSummary = (overrides: Partial<GymPlanSummary> = {}): GymPlanSummary => ({
  id: 'p1',
  name: 'Fuerza 3 días',
  status: 'ACTIVE',
  createdAt: '2026-11-01T00:00:00.000Z',
  archivedAt: null,
  dayCount: 3,
  exerciseCount: 8,
  ...overrides,
});

export const catalogExercise = (overrides: Partial<GymCatalogExercise> = {}): GymCatalogExercise => ({
  id: 'c1',
  name: 'Sentadilla',
  sets: 4,
  reps: '12',
  currentWeightKg: 60,
  ...overrides,
});

export const weightEntry = (overrides: Partial<GymWeightEntry> = {}): GymWeightEntry => ({
  id: 'w1',
  weightKg: 60,
  sets: 4,
  reps: '12',
  recordedAt: '2026-11-12T15:00:00.000Z',
  ...overrides,
});
