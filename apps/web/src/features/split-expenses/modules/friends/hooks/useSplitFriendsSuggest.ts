import useSWR from 'swr';

import { buildQueryString, SWR_KEYS } from '@/shared/api';

import type { SplitFriendSuggest } from '@omni/shared/split-expenses';

export function useSplitFriendsSuggest(q: string, limit = 10) {
  const trimmed = q.trim();
  const key = trimmed ? `${SWR_KEYS.splitExpenses.friendsSuggest}${buildQueryString({ q: trimmed, limit })}` : null;
  const { data, error, isLoading } = useSWR<SplitFriendSuggest[]>(key);
  return { items: data ?? [], isLoading, error };
}
