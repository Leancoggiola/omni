import type { GymPlanStatus, GymWeekday } from './constants';

export interface GymExercise {
  id: string;
  catalogId: string;
  name: string;
  sets: number | null;
  reps: string;
  currentWeightKg: number | null;
  sortOrder: number;
}

export interface GymPlanDay {
  id: string;
  weekday: GymWeekday;
  exercises: GymExercise[];
}

export interface GymPlanDetail {
  id: string;
  name: string;
  status: GymPlanStatus;
  createdAt: string;
  archivedAt: string | null;
  days: GymPlanDay[];
}

export interface GymPlanSummary {
  id: string;
  name: string;
  status: GymPlanStatus;
  createdAt: string;
  archivedAt: string | null;
  dayCount: number;
  exerciseCount: number;
}

export interface GymCatalogExercise {
  id: string;
  name: string;
  sets: number | null;
  reps: string;
  currentWeightKg: number | null;
}

export interface GymWeightEntry {
  id: string;
  weightKg: number;
  sets: number | null;
  reps: string;
  recordedAt: string;
}
