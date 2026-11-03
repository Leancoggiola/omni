import useSWR from 'swr';

import { SWR_KEYS } from '@/shared/api';

import type { HouseholdInfo } from '@omni/shared/household';

/**
 * El hogar de la sesión: integrantes e invitación pendiente. Es `useSWR` (no immutable) porque cambia por fuera de
 * esta pestaña: la pareja puede unirse o desvincularse, y no hay push.
 */
export function useHousehold() {
  const { data, isLoading, error, mutate } = useSWR<HouseholdInfo>(SWR_KEYS.household.current);

  return { household: data ?? null, isLoading, error, mutate };
}
