import useSWR from 'swr';

import { SWR_KEYS } from '@/shared/api';

import type { SplitFriend } from '@omni/shared/split-expenses';

export function useSplitFriends() {
  const { data, error, isLoading } = useSWR<SplitFriend[]>(SWR_KEYS.splitExpenses.friends);
  return { items: data ?? [], isLoading, error };
}
