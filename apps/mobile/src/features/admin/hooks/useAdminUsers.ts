import useSWR from 'swr';

import { API_KEYS } from '@/shared/api';

import type { AdminUsersResponse } from '@omni/shared/users';

/** Usuarios de la app para el panel de administración (= `useAdminUsers` de web). */
export function useAdminUsers() {
  const { data, error, isLoading, mutate } = useSWR<AdminUsersResponse>(API_KEYS.admin.users);

  return { users: data?.users ?? [], isLoading, error, mutate };
}
