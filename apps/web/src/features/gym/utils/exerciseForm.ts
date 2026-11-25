import { z } from 'zod';

import type { AddGymExercisePayload, GymWeekday, UpdateGymExercisePayload } from '@omni/shared/gym';

import { EXERCISE_SETS_MAX } from '@omni/shared/common';
import { GYM_EXERCISE_NAME_MAX, GYM_REPS_MAX, gymWeekdaySchema } from '@omni/shared/gym';

export interface ExerciseFieldsValues {
  name: string;
  sets: number | string;
  reps: string;
}

export interface ExerciseFormValues extends ExerciseFieldsValues {
  weekday: GymWeekday;
}

const SETS_MESSAGE = `Ingresá un número entero entre 1 y ${EXERCISE_SETS_MAX}`;

const exerciseFieldsShape = {
  name: z.string().trim().min(1, 'Ponele un nombre al ejercicio').max(GYM_EXERCISE_NAME_MAX),
  sets: z.union([
    z.literal(''),
    z.number({ error: SETS_MESSAGE }).int(SETS_MESSAGE).positive(SETS_MESSAGE).max(EXERCISE_SETS_MAX, SETS_MESSAGE),
  ]),
  reps: z.string().trim().min(1, 'Ingresá las repeticiones').max(GYM_REPS_MAX),
};

export const exerciseFieldsSchema: z.ZodType<ExerciseFieldsValues> = z.object(exerciseFieldsShape);

export const exerciseFormSchema: z.ZodType<ExerciseFormValues> = z.object({
  weekday: gymWeekdaySchema,
  ...exerciseFieldsShape,
});

export function initialExerciseFormValues(weekday: GymWeekday): ExerciseFormValues {
  return { weekday, name: '', sets: '', reps: '' };
}

/** Las series del form como las espera la API: `''` → `null`. */
export function toSets(sets: number | string): number | null {
  return sets === '' ? null : Number(sets);
}

export function toAddExercisePayload(planId: string, values: ExerciseFormValues): AddGymExercisePayload {
  return {
    planId,
    weekday: values.weekday,
    name: values.name.trim(),
    sets: toSets(values.sets),
    reps: values.reps.trim(),
  };
}

/** Editar manda solo nombre, series y repeticiones; las series vacías van como `null` (con `undefined` la API conserva las anteriores). */
export function toEditExercisePayload(values: ExerciseFieldsValues): UpdateGymExercisePayload {
  return { name: values.name.trim(), sets: toSets(values.sets), reps: values.reps.trim() };
}
