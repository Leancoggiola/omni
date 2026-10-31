import useSWR from 'swr';

import { API_KEYS } from '@/shared/api';

import type { HouseholdInfo } from '@omni/shared/household';

/**
 * El hogar de la sesión: integrantes e invitación pendiente. Es `useSWR` (revalida al volver a primer plano) porque
 * cambia por fuera del dispositivo: la pareja puede unirse o desvincularse, y no hay push.
 */
export function useHousehold() {
  const { data, error, isLoading, mutate } = useSWR<HouseholdInfo>(API_KEYS.household.current);

  return { household: data ?? null, error, isLoading, mutate };
}
