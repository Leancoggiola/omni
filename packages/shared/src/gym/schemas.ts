import { z } from 'zod';
import {
  GYM_CATALOG_DEFAULT_LIMIT,
  GYM_CATALOG_MAX_LIMIT,
  GYM_DAY_EXERCISES_MAX,
  GYM_EXERCISE_NAME_MAX,
  GYM_PLAN_NAME_MAX,
  GYM_PLAN_STATUSES,
  GYM_REPS_MAX,
  GYM_WEEKDAYS,
} from './constants';
import { AMOUNT_MAX_8_2, EXERCISE_SETS_MAX, idSchema, SEARCH_QUERY_MAX_LENGTH } from '../common/limits';
import { paginationSchema } from '../common/pagination';

const gymPlanNameSchema = z.string().trim().min(1).max(GYM_PLAN_NAME_MAX);
const gymExerciseNameSchema = z.string().trim().min(1).max(GYM_EXERCISE_NAME_MAX);
const gymSetsSchema = z.number().int().positive().max(EXERCISE_SETS_MAX).nullable();
const gymRepsSchema = z.string().trim().min(1).max(GYM_REPS_MAX);

export const gymWeekdaySchema = z.enum(GYM_WEEKDAYS);

export const listGymPlansSchema = paginationSchema.extend({
  status: z.enum(GYM_PLAN_STATUSES).optional(),
});

export type ListGymPlansParams = z.infer<typeof listGymPlansSchema>;

export const createGymPlanSchema = z.object({
  name: gymPlanNameSchema,
});

export type CreateGymPlanPayload = z.infer<typeof createGymPlanSchema>;

export const updateGymPlanSchema = z
  .object({
    name: gymPlanNameSchema,
  })
  .strict();

export type UpdateGymPlanPayload = z.infer<typeof updateGymPlanSchema>;

export const updateGymDaySchema = z
  .object({
    weekday: gymWeekdaySchema,
  })
  .strict();

export type UpdateGymDayPayload = z.infer<typeof updateGymDaySchema>;

/** El orden completo de los ejercicios del día: tiene que nombrar a todos, una sola vez cada uno. */
export const reorderGymDayExercisesSchema = z
  .object({
    exerciseIds: z
      .array(idSchema)
      .min(1)
      .max(GYM_DAY_EXERCISES_MAX)
      .refine(ids => new Set(ids).size === ids.length, { message: 'Hay ejercicios repetidos' }),
  })
  .strict();

export type ReorderGymDayExercisesPayload = z.infer<typeof reorderGymDayExercisesSchema>;

export const addGymExerciseSchema = z.object({
  planId: idSchema,
  weekday: gymWeekdaySchema,
  name: gymExerciseNameSchema,
  sets: gymSetsSchema.optional(),
  reps: gymRepsSchema,
});

export type AddGymExercisePayload = z.infer<typeof addGymExerciseSchema>;

/** `name`, `sets` y `reps` cambian la variante del catálogo (en todos los planes); `weekday` mueve solo esta fila. */
export const updateGymExerciseSchema = z
  .object({
    name: gymExerciseNameSchema.optional(),
    sets: gymSetsSchema.optional(),
    reps: gymRepsSchema.optional(),
    weekday: gymWeekdaySchema.optional(),
  })
  .strict();

export type UpdateGymExercisePayload = z.infer<typeof updateGymExerciseSchema>;

export const updateGymExerciseWeightSchema = z.object({
  weightKg: z.number().nonnegative().max(AMOUNT_MAX_8_2).nullable(),
});

export type UpdateGymExerciseWeightPayload = z.infer<typeof updateGymExerciseWeightSchema>;

/** Historial de peso, del más nuevo al más viejo. */
export const listGymWeightHistorySchema = paginationSchema;

export type ListGymWeightHistoryParams = z.infer<typeof listGymWeightHistorySchema>;

/** Sin `q` lista el catálogo completo (hasta `limit`), ordenado por nombre. */
export const suggestGymCatalogSchema = z.object({
  q: z.string().trim().min(1).max(SEARCH_QUERY_MAX_LENGTH).optional(),
  limit: z.coerce.number().int().min(1).max(GYM_CATALOG_MAX_LIMIT).default(GYM_CATALOG_DEFAULT_LIMIT),
});

export type SuggestGymCatalogParams = z.infer<typeof suggestGymCatalogSchema>;
