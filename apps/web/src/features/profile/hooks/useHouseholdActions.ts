import { useCallback } from 'react';
import { useSWRConfig } from 'swr';

import { api, SWR_KEYS } from '@/shared/api';

import type { CreatedHouseholdInvite, HouseholdInvitePreview } from '@omni/shared/household';

/**
 * Acciones sobre el hogar. Unirse o desvincularse cambia qué ítems son "míos", así que además del hogar se
 * invalida la lista de media (la alacena todavía no tiene cliente). `useSWRImmutable` no revalida solo: se
 * vacía la key para que el próximo montaje la pida de nuevo.
 */
export function useHouseholdActions() {
  const { mutate } = useSWRConfig();

  const refreshHousehold = useCallback(() => mutate(SWR_KEYS.household.current), [mutate]);

  const refreshSharedData = useCallback(async () => {
    await Promise.all([
      mutate(SWR_KEYS.household.current),
      mutate(SWR_KEYS.media.list, undefined, { revalidate: true }),
    ]);
  }, [mutate]);

  const createInvite = useCallback(async () => {
    const invite = await api.post<CreatedHouseholdInvite>(SWR_KEYS.household.invite);
    await refreshHousehold();
    return invite;
  }, [refreshHousehold]);

  const revokeInvite = useCallback(async () => {
    await api.delete(SWR_KEYS.household.invite);
    await refreshHousehold();
  }, [refreshHousehold]);

  const previewInvite = useCallback(
    (code: string) => api.post<HouseholdInvitePreview>(SWR_KEYS.household.invitePreview, { code }),
    []
  );

  const acceptInvite = useCallback(
    async (code: string) => {
      await api.post(SWR_KEYS.household.inviteAccept, { code });
      await refreshSharedData();
    },
    [refreshSharedData]
  );

  const leaveHousehold = useCallback(async () => {
    await api.post(SWR_KEYS.household.leave);
    await refreshSharedData();
  }, [refreshSharedData]);

  return { createInvite, revokeInvite, previewInvite, acceptInvite, leaveHousehold };
}
