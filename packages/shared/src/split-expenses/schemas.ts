import { z } from 'zod';
import { isoDateStringSchema } from '../common/dates';
import { paginationSchema } from '../common/pagination';
import type { FriendFormValues, NewGatheringFormValues } from './types';
import {
  GATHERING_EXPENSE_DESCRIPTION_MAX,
  GATHERING_NAME_MAX,
  SPLIT_FRIEND_ALIAS_MAX,
  SPLIT_FRIEND_ALIAS_MIN,
  SPLIT_FRIEND_ALIAS_PATTERN,
  SPLIT_FRIEND_NAME_MAX,
  SUGGEST_FRIENDS_DEFAULT_LIMIT,
  SUGGEST_FRIENDS_MAX_LIMIT,
} from './constants';

const splitFriendAliasSchema = z
  .string()
  .trim()
  .min(SPLIT_FRIEND_ALIAS_MIN, `El alias debe tener al menos ${SPLIT_FRIEND_ALIAS_MIN} caracteres`)
  .max(SPLIT_FRIEND_ALIAS_MAX, `El alias no puede superar los ${SPLIT_FRIEND_ALIAS_MAX} caracteres`)
  .regex(SPLIT_FRIEND_ALIAS_PATTERN, 'El alias solo puede tener letras, números, puntos, guiones y guiones bajos');

export const createSplitFriendSchema = z.object({
  name: z.string().trim().min(1).max(SPLIT_FRIEND_NAME_MAX),
  alias: splitFriendAliasSchema,
});

export type CreateSplitFriendPayload = z.infer<typeof createSplitFriendSchema>;

export const updateSplitFriendSchema = z
  .object({
    name: z.string().trim().min(1).max(SPLIT_FRIEND_NAME_MAX).optional(),
    alias: splitFriendAliasSchema.optional(),
  })
  .strict();

export type UpdateSplitFriendPayload = z.infer<typeof updateSplitFriendSchema>;

export const suggestSplitFriendsSchema = z.object({
  q: z.string().trim().min(1),
  limit: z.coerce.number().int().min(1).max(SUGGEST_FRIENDS_MAX_LIMIT).default(SUGGEST_FRIENDS_DEFAULT_LIMIT),
});

export type SuggestSplitFriendsParams = z.infer<typeof suggestSplitFriendsSchema>;

const gatheringParticipantInputSchema = z.union([
  z.object({ friendId: z.string().min(1) }),
  z.object({ name: z.string().trim().min(1).max(SPLIT_FRIEND_NAME_MAX) }),
]);

export const createGatheringSchema = z.object({
  name: z.string().trim().min(1).max(GATHERING_NAME_MAX),
  date: isoDateStringSchema,
  participants: z.array(gatheringParticipantInputSchema).min(1),
});

export type CreateGatheringPayload = z.infer<typeof createGatheringSchema>;

export const addGatheringExpenseSchema = z.object({
  participantId: z.string().min(1),
  amount: z.number().positive(),
  description: z.string().trim().max(GATHERING_EXPENSE_DESCRIPTION_MAX).nullable().optional(),
});

export type AddGatheringExpensePayload = z.infer<typeof addGatheringExpenseSchema>;

export const toggleGatheringSettledSchema = z.object({
  isSettled: z.boolean(),
});

export type ToggleGatheringSettledPayload = z.infer<typeof toggleGatheringSettledSchema>;

export const listGatheringsSchema = paginationSchema;

export type ListGatheringsParams = z.infer<typeof listGatheringsSchema>;

// ── Client form schemas ───────────────────────────────────────

export const friendFormSchema: z.ZodType<FriendFormValues> = z.object({
  name: z.string().trim().min(1, 'Ingresá un nombre').max(SPLIT_FRIEND_NAME_MAX),
  alias: splitFriendAliasSchema,
});

const gatheringParticipantDraftSchema = z.object({
  key: z.string(),
  friendId: z.string().nullable(),
  displayName: z.string().trim().min(1).max(SPLIT_FRIEND_NAME_MAX),
});

export const newGatheringFormSchema: z.ZodType<NewGatheringFormValues> = z.object({
  name: z.string().trim().min(1, 'Ingresá un nombre').max(GATHERING_NAME_MAX),
  date: isoDateStringSchema,
  participants: z.array(gatheringParticipantDraftSchema).min(1, 'Agregá al menos un participante'),
});
