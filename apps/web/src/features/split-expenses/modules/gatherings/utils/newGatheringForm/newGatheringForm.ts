import { z } from 'zod';

import type { CreateGatheringPayload } from '@omni/shared/split-expenses';

import { appDateKey, GATHERING_PARTICIPANTS_MAX, isoDateStringSchema } from '@omni/shared/common';
import { GATHERING_NAME_MAX, SPLIT_FRIEND_NAME_MAX } from '@omni/shared/split-expenses';

export interface GatheringParticipantDraft {
  key: string;
  friendId: string | null;
  displayName: string;
}

export interface NewGatheringFormValues {
  name: string;
  date: string;
  participants: GatheringParticipantDraft[];
}

const gatheringParticipantDraftSchema = z.object({
  key: z.string(),
  friendId: z.string().nullable(),
  displayName: z.string().trim().min(1).max(SPLIT_FRIEND_NAME_MAX),
});

export const newGatheringFormSchema: z.ZodType<NewGatheringFormValues> = z.object({
  name: z.string().trim().min(1, 'Ingresá un nombre').max(GATHERING_NAME_MAX),
  date: isoDateStringSchema,
  participants: z
    .array(gatheringParticipantDraftSchema)
    .min(1, 'Agregá al menos un participante')
    .max(GATHERING_PARTICIPANTS_MAX),
});

export function createInitialNewGatheringValues(): NewGatheringFormValues {
  return {
    name: '',
    date: appDateKey(),
    participants: [],
  };
}

export function toCreateGatheringPayload(values: NewGatheringFormValues): CreateGatheringPayload {
  return {
    name: values.name.trim(),
    date: values.date,
    participants: values.participants.map(participant =>
      participant.friendId ? { friendId: participant.friendId } : { name: participant.displayName.trim() }
    ),
  };
}
