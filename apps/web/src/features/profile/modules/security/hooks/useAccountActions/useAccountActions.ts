import { useCallback, useState } from 'react';

import { api, SWR_KEYS } from '@/shared/api';

import type { ChangePasswordPayload } from '@omni/shared/users';

export function useAccountActions() {
  const [isMutating, setIsMutating] = useState(false);

  const changePassword = useCallback(async (payload: ChangePasswordPayload) => {
    setIsMutating(true);
    try {
      await api.patch(SWR_KEYS.users.password, payload);
    } finally {
      setIsMutating(false);
    }
  }, []);

  const deleteAccount = useCallback(async () => {
    setIsMutating(true);
    try {
      await api.delete(SWR_KEYS.users.account);
    } finally {
      setIsMutating(false);
    }
  }, []);

  return { changePassword, deleteAccount, isMutating };
}
