import useSWR from 'swr';

import { SWR_KEYS } from '@/shared/api';

import type { AdminUsersResponse } from '@omni/shared/users';

export function useAdminUsers() {
  const { data, error, isLoading, mutate } = useSWR<AdminUsersResponse>(SWR_KEYS.admin.users);

  return { users: data?.users ?? [], isLoading, error, mutate };
}
