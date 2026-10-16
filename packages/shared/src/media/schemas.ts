import { z } from 'zod';
import { INT4_MAX, SEARCH_QUERY_MAX_LENGTH, TMDB_PAGE_MAX } from '../common/limits';
import { MEDIA_TYPES, MEDIA_STATUSES, SEARCH_TYPES } from './constants';
import type { AddMediaFormValues } from './types';

export const addMediaItemSchema = z.object({
  tmdbId: z.number().int().positive().max(INT4_MAX),
  mediaType: z.enum(MEDIA_TYPES),
  status: z.enum(MEDIA_STATUSES).default('to_watch'),
});
export type AddMediaItemPayload = z.infer<typeof addMediaItemSchema>;

export const addMediaFormSchema: z.ZodType<AddMediaFormValues> = z.object({
  titleQuery: z.string(),
  tmdbId: z
    .number()
    .int()
    .positive()
    .max(INT4_MAX)
    .nullable()
    .refine(value => value != null, 'Seleccioná un título desde TMDB'),
  mediaType: z.enum(MEDIA_TYPES),
  status: z.enum(MEDIA_STATUSES),
});

export const updateMediaItemSchema = z.object({
  status: z.enum(MEDIA_STATUSES),
});
export type UpdateMediaItemPayload = z.infer<typeof updateMediaItemSchema>;

export const searchMediaSchema = z.object({
  query: z.string().max(SEARCH_QUERY_MAX_LENGTH),
  page: z.coerce.number().int().min(1).max(TMDB_PAGE_MAX).default(1),
  type: z.enum(SEARCH_TYPES).default('multi'),
});
export type SearchMediaParams = z.infer<typeof searchMediaSchema>;

export const filterMediaSchema = z.object({
  status: z.enum(MEDIA_STATUSES).optional(),
  mediaType: z.enum(MEDIA_TYPES).optional(),
});
export type FilterMediaParams = z.infer<typeof filterMediaSchema>;
