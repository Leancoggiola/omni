import type { GymPlanDetail } from '@omni/shared/gym';

export interface GymPlanStats {
  dayCount: number;
  exerciseCount: number;
  withoutWeightCount: number;
}

/** Contadores del plan: días, ejercicios (filas, no variantes) y ejercicios sin peso cargado. */
export function getPlanStats(plan: GymPlanDetail): GymPlanStats {
  const exercises = plan.days.flatMap(day => day.exercises);
  return {
    dayCount: plan.days.length,
    exerciseCount: exercises.length,
    withoutWeightCount: exercises.filter(exercise => exercise.currentWeightKg === null).length,
  };
}
