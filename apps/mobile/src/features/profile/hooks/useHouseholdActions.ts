import { useSWRConfig } from 'swr';

import { api, API_KEYS } from '@/shared/api';

import type { CreatedHouseholdInvite, HouseholdInvitePreview } from '@omni/shared/household';

/**
 * Acciones sobre el hogar. Unirse o desvincularse cambia qué ítems son "míos", así que además del hogar se
 * invalida la lista de media (la alacena todavía no tiene cliente).
 */
export function useHouseholdActions() {
  const { mutate } = useSWRConfig();

  const refreshHousehold = () => mutate(API_KEYS.household.current);

  const refreshSharedData = async () => {
    await Promise.all([mutate(API_KEYS.household.current), mutate(API_KEYS.media.list)]);
  };

  const createInvite = async () => {
    const invite = await api.post<CreatedHouseholdInvite>(API_KEYS.household.invite);
    await refreshHousehold();
    return invite;
  };

  const revokeInvite = async () => {
    await api.delete(API_KEYS.household.invite);
    await refreshHousehold();
  };

  const previewInvite = (code: string) => api.post<HouseholdInvitePreview>(API_KEYS.household.invitePreview, { code });

  const acceptInvite = async (code: string) => {
    await api.post(API_KEYS.household.inviteAccept, { code });
    await refreshSharedData();
  };

  const leaveHousehold = async () => {
    await api.post(API_KEYS.household.leave);
    await refreshSharedData();
  };

  return { createInvite, revokeInvite, previewInvite, acceptInvite, leaveHousehold };
}
