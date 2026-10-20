import type { CreateGatheringPayload, NewGatheringFormValues } from '@omni/shared/split-expenses';

import { appDateKey } from '@omni/shared/common';
import { newGatheringFormSchema } from '@omni/shared/split-expenses';

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

export { newGatheringFormSchema };
export type { NewGatheringFormValues };
