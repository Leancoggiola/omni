import { z } from 'zod';

import type { CreateSplitFriendPayload } from '@omni/shared/split-expenses';

import { createSplitFriendSchema, SPLIT_FRIEND_NAME_MAX } from '@omni/shared/split-expenses';

export interface FriendFormValues {
  name: string;
  alias: string;
}

export const friendFormSchema: z.ZodType<FriendFormValues> = z.object({
  name: z.string().trim().min(1, 'Ingresá un nombre').max(SPLIT_FRIEND_NAME_MAX),
  alias: createSplitFriendSchema.shape.alias,
});

export const INITIAL_FRIEND_FORM_VALUES: FriendFormValues = {
  name: '',
  alias: '',
};

export function toCreateFriendPayload(values: FriendFormValues): CreateSplitFriendPayload {
  return {
    name: values.name.trim(),
    alias: values.alias.trim(),
  };
}
