import { useCallback } from 'react';
import { useSWRConfig } from 'swr';

import { api, API_KEYS } from '@/shared/api';

import type { CreateUserPayload } from '@omni/shared/auth';
import type { AdminUser } from '@omni/shared/users';

/** Crear y eliminar usuarios; al terminar revalida el listado (= `useAdminUserMutations` de web). */
export function useAdminUserMutations() {
  const { mutate } = useSWRConfig();

  const invalidateUsers = useCallback(async () => {
    await mutate((key: unknown) => typeof key === 'string' && key.startsWith(API_KEYS.admin.users)).catch(
      () => undefined
    );
  }, [mutate]);

  const createUser = useCallback(
    async (payload: CreateUserPayload) => {
      const { user } = await api.post<{ user: AdminUser }>(API_KEYS.admin.users, payload);
      await invalidateUsers();
      return user;
    },
    [invalidateUsers]
  );

  const deleteUser = useCallback(
    async (id: string) => {
      await api.delete(API_KEYS.admin.user(id));
      await invalidateUsers();
    },
    [invalidateUsers]
  );

  return { createUser, deleteUser };
}
