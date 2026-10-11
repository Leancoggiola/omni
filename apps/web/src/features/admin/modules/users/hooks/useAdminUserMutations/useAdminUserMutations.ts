import { useCallback } from 'react';
import { useSWRConfig } from 'swr';

import { api, SWR_KEYS } from '@/shared/api';

import type { CreateUserPayload } from '@omni/shared/auth';
import type { AdminUser } from '@omni/shared/users';

export function useAdminUserMutations() {
  const { mutate } = useSWRConfig();

  const invalidateUsers = useCallback(async () => {
    await mutate((key: unknown) => typeof key === 'string' && key.startsWith(SWR_KEYS.admin.users)).catch(
      () => undefined
    );
  }, [mutate]);

  const createUser = useCallback(
    async (payload: CreateUserPayload) => {
      const { user } = await api.post<{ user: AdminUser }>(SWR_KEYS.admin.users, payload);
      await invalidateUsers();
      return user;
    },
    [invalidateUsers]
  );

  const deleteUser = useCallback(
    async (id: string) => {
      await api.delete(SWR_KEYS.admin.user(id));
      await invalidateUsers();
    },
    [invalidateUsers]
  );

  return { createUser, deleteUser };
}
