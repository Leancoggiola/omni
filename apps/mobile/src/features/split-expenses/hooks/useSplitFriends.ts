import useSWR from 'swr';

import { API_KEYS } from '@/shared/api';

import type { SplitFriendWithBalance } from '@omni/shared/split-expenses';

/** Amigos guardados, por nombre, con su saldo en las juntadas activas. */
export function useSplitFriends() {
  const { data, error, isLoading, mutate } = useSWR<SplitFriendWithBalance[]>(API_KEYS.splitExpenses.friends);
  return { friends: data, isLoading, error, mutate };
}
