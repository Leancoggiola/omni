import { useCallback } from 'react';
import { useSWRConfig } from 'swr';

import { api, SWR_KEYS } from '@/shared/api';

import type {
  AddGatheringExpensePayload,
  CreateGatheringPayload,
  CreateSplitFriendPayload,
  GatheringDetail,
  SplitFriend,
  ToggleGatheringSettledPayload,
  UpdateSplitFriendPayload,
} from '@omni/shared/split-expenses';

export function useSplitExpensesMutations() {
  const { mutate } = useSWRConfig();

  const invalidateFriends = useCallback(async () => {
    await mutate(
      (key: unknown) =>
        typeof key === 'string' &&
        (key === SWR_KEYS.splitExpenses.friends || key.startsWith(SWR_KEYS.splitExpenses.friendsSuggest))
    );
  }, [mutate]);

  const invalidateGatherings = useCallback(
    async (excludeGatheringId?: string) => {
      const excluded = excludeGatheringId ? SWR_KEYS.splitExpenses.gathering(excludeGatheringId) : null;
      await mutate(
        (key: unknown) =>
          typeof key === 'string' && key.startsWith(SWR_KEYS.splitExpenses.gatherings) && key !== excluded
      );
    },
    [mutate]
  );

  const createFriend = useCallback(
    async (payload: CreateSplitFriendPayload) => {
      const friend = await api.post<SplitFriend>(SWR_KEYS.splitExpenses.friends, payload);
      await invalidateFriends();
      return friend;
    },
    [invalidateFriends]
  );

  const updateFriend = useCallback(
    async (friendId: string, payload: UpdateSplitFriendPayload) => {
      const friend = await api.patch<SplitFriend>(SWR_KEYS.splitExpenses.friend(friendId), payload);
      await invalidateFriends();
      return friend;
    },
    [invalidateFriends]
  );

  const deleteFriend = useCallback(
    async (friendId: string) => {
      await api.delete(SWR_KEYS.splitExpenses.friend(friendId));
      await invalidateFriends();
    },
    [invalidateFriends]
  );

  const createGathering = useCallback(
    async (payload: CreateGatheringPayload) => {
      const gathering = await api.post<GatheringDetail>(SWR_KEYS.splitExpenses.gatherings, payload);
      await invalidateGatherings();
      return gathering;
    },
    [invalidateGatherings]
  );

  const toggleGatheringSettled = useCallback(
    async (gatheringId: string, payload: ToggleGatheringSettledPayload) => {
      const gathering = await api.patch<GatheringDetail>(SWR_KEYS.splitExpenses.gatheringSettled(gatheringId), payload);
      await invalidateGatherings();
      return gathering;
    },
    [invalidateGatherings]
  );

  const deleteGathering = useCallback(
    async (gatheringId: string) => {
      await api.delete(SWR_KEYS.splitExpenses.gathering(gatheringId));
      await invalidateGatherings(gatheringId);
    },
    [invalidateGatherings]
  );

  const addGatheringExpense = useCallback(
    async (gatheringId: string, payload: AddGatheringExpensePayload) => {
      const gathering = await api.post<GatheringDetail>(SWR_KEYS.splitExpenses.gatheringExpenses(gatheringId), payload);
      await invalidateGatherings();
      return gathering;
    },
    [invalidateGatherings]
  );

  const deleteGatheringExpense = useCallback(
    async (gatheringId: string, expenseId: string) => {
      await api.delete(SWR_KEYS.splitExpenses.gatheringExpense(gatheringId, expenseId));
      await invalidateGatherings();
    },
    [invalidateGatherings]
  );

  return {
    createFriend,
    updateFriend,
    deleteFriend,
    createGathering,
    toggleGatheringSettled,
    deleteGathering,
    addGatheringExpense,
    deleteGatheringExpense,
  };
}
