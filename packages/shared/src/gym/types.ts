import type { GymPlanStatus, GymWeekday } from './constants';

/**
 * Un ejercicio dentro de un día del plan. `id` es el de esa fila del plan (el que usan las rutas `/exercises/:id`);
 * `catalogId` es la variante del catálogo (nombre + series + repeticiones) que comparte peso e historial con los demás
 * planes que la usan.
 */
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

/** Una variante del catálogo del usuario: "Sentadilla 4×12" y "Sentadilla 3×8" son dos entradas distintas. */
export interface GymCatalogExercise {
  id: string;
  name: string;
  sets: number | null;
  reps: string;
  currentWeightKg: number | null;
}

/** Un peso registrado, con las series y repeticiones que tenía la variante en ese momento. */
export interface GymWeightEntry {
  id: string;
  weightKg: number;
  sets: number | null;
  reps: string;
  recordedAt: string;
}
