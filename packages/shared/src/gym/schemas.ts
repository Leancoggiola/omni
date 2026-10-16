import { z } from 'zod';
import { GYM_PLAN_STATUSES } from './constants';
import { AMOUNT_MAX_8_2, idSchema } from '../common/limits';
import { paginationSchema } from '../common/pagination';

export const listGymPlansSchema = paginationSchema.extend({
  status: z.enum(GYM_PLAN_STATUSES).optional(),
});

export type ListGymPlansParams = z.infer<typeof listGymPlansSchema>;

export const createGymPlanSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
});

export type CreateGymPlanPayload = z.infer<typeof createGymPlanSchema>;

export const addGymExerciseSchema = z.object({
  planId: idSchema,
  dayLabel: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(120),
  sets: z.number().int().positive().nullable().optional(),
  reps: z.string().trim().min(1).max(40),
});

export type AddGymExercisePayload = z.infer<typeof addGymExerciseSchema>;

export const updateGymExerciseSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    sets: z.number().int().positive().nullable().optional(),
    reps: z.string().trim().min(1).max(40).optional(),
    dayLabel: z.string().trim().min(1).max(80).optional(),
  })
  .strict();

export type UpdateGymExercisePayload = z.infer<typeof updateGymExerciseSchema>;

export const updateGymExerciseWeightSchema = z.object({
  weightKg: z.number().nonnegative().max(AMOUNT_MAX_8_2).nullable(),
});

export type UpdateGymExerciseWeightPayload = z.infer<typeof updateGymExerciseWeightSchema>;
