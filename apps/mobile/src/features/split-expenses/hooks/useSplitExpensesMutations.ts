import { useCallback } from 'react';
import { useSWRConfig } from 'swr';

import { api, API_KEYS } from '@/shared/api';

import { isSplitKey } from '../utils/splitKeys';

import type {
  AddGatheringExpensePayload,
  CreateGatheringPayload,
  CreateSplitFriendPayload,
  GatheringDetail,
  SplitFriend,
  UpdateSplitFriendPayload,
} from '@omni/shared/split-expenses';

/**
 * Escrituras de División de gastos. Un gasto, un saldado o un borrado cambian la lista, el saldo propio y el de cada
 * amigo, así que cada escritura revalida las keys del módulo (`isSplitKey`); si la respuesta ya trae el detalle de la
 * juntada se guarda en la caché antes, para verlo sin esperar. Todas tiran si la API responde error; el mensaje viene
 * de la API. Una revalidación que falla no hace fallar la escritura. `deleteGathering` no revalida el detalle
 * borrado (daría 404).
 */
export function useSplitExpensesMutations() {
  const { mutate } = useSWRConfig();

  const revalidate = useCallback(
    async (except?: string) => {
      await mutate((key: unknown) => isSplitKey(key) && key !== except).catch(() => undefined);
    },
    [mutate]
  );

  const storeGathering = useCallback(
    async (gathering: GatheringDetail) => {
      const key = API_KEYS.splitExpenses.gathering(gathering.id);
      await mutate(key, gathering, { revalidate: false });
      await revalidate(key);
    },
    [mutate, revalidate]
  );

  const createFriend = useCallback(
    async (payload: CreateSplitFriendPayload) => {
      const friend = await api.post<SplitFriend>(API_KEYS.splitExpenses.friends, payload);
      await revalidate();
      return friend;
    },
    [revalidate]
  );

  const updateFriend = useCallback(
    async (friendId: string, payload: UpdateSplitFriendPayload) => {
      const friend = await api.patch<SplitFriend>(API_KEYS.splitExpenses.friend(friendId), payload);
      await revalidate();
      return friend;
    },
    [revalidate]
  );

  const deleteFriend = useCallback(
    async (friendId: string) => {
      await api.delete(API_KEYS.splitExpenses.friend(friendId));
      await revalidate();
    },
    [revalidate]
  );

  const createGathering = useCallback(
    async (payload: CreateGatheringPayload) => {
      const gathering = await api.post<GatheringDetail>(API_KEYS.splitExpenses.gatherings, payload);
      await storeGathering(gathering);
      return gathering;
    },
    [storeGathering]
  );

  const setGatheringSettled = useCallback(
    async (gatheringId: string, isSettled: boolean) => {
      const gathering = await api.patch<GatheringDetail>(API_KEYS.splitExpenses.gatheringSettled(gatheringId), {
        isSettled,
      });
      await storeGathering(gathering);
      return gathering;
    },
    [storeGathering]
  );

  const deleteGathering = useCallback(
    async (gatheringId: string) => {
      await api.delete(API_KEYS.splitExpenses.gathering(gatheringId));
      await revalidate(API_KEYS.splitExpenses.gathering(gatheringId));
    },
    [revalidate]
  );

  const addExpense = useCallback(
    async (gatheringId: string, payload: AddGatheringExpensePayload) => {
      const gathering = await api.post<GatheringDetail>(API_KEYS.splitExpenses.gatheringExpenses(gatheringId), payload);
      await storeGathering(gathering);
      return gathering;
    },
    [storeGathering]
  );

  const deleteExpense = useCallback(
    async (gatheringId: string, expenseId: string) => {
      await api.delete(API_KEYS.splitExpenses.gatheringExpense(gatheringId, expenseId));
      await revalidate();
    },
    [revalidate]
  );

  return {
    createFriend,
    updateFriend,
    deleteFriend,
    createGathering,
    setGatheringSettled,
    deleteGathering,
    addExpense,
    deleteExpense,
  };
}
