import type { CreateGatheringPayload, NewGatheringFormValues } from '@omni/shared/split-expenses';

import { newGatheringFormSchema } from '@omni/shared/split-expenses';

/** Local YYYY-MM-DD for today, used as the default gathering date. */
export function todayIsoDate(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function createInitialNewGatheringValues(): NewGatheringFormValues {
  return {
    name: '',
    date: todayIsoDate(),
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
