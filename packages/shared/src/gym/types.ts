import type { GymPlanStatus } from './constants';

export interface GymExercise {
  id: string;
  name: string;
  sets: number | null;
  reps: string;
  currentWeightKg: number | null;
  sortOrder: number;
}

export interface GymPlanDay {
  id: string;
  label: string;
  sortOrder: number;
  exercises: GymExercise[];
}

export interface GymPlanDetail {
  id: string;
  name: string | null;
  status: GymPlanStatus;
  createdAt: string;
  archivedAt: string | null;
  days: GymPlanDay[];
}

export interface GymPlanSummary {
  id: string;
  name: string | null;
  status: GymPlanStatus;
  createdAt: string;
  archivedAt: string | null;
  dayCount: number;
  exerciseCount: number;
}
