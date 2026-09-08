import type { CreateSplitFriendPayload, FriendFormValues, UpdateSplitFriendPayload } from '@omni/shared/split-expenses';

import { friendFormSchema } from '@omni/shared/split-expenses';

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

export function toUpdateFriendPayload(values: FriendFormValues): UpdateSplitFriendPayload {
  return {
    name: values.name.trim(),
    alias: values.alias.trim(),
  };
}

export { friendFormSchema };
export type { FriendFormValues };
