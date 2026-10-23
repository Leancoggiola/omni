import { z } from 'zod';

import type { MediaStatus, MediaType } from '@omni/shared/media';

import { INT4_MAX } from '@omni/shared/common';
import { MEDIA_STATUSES, MEDIA_TYPES } from '@omni/shared/media';

export interface AddMediaFormValues {
  titleQuery: string;
  tmdbId: number | null;
  mediaType: MediaType;
  status: MediaStatus;
}

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

export const INITIAL_ADD_MEDIA_FORM_VALUES: AddMediaFormValues = {
  titleQuery: '',
  tmdbId: null,
  mediaType: 'movie',
  status: 'to_watch',
};
