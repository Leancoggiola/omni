import { api, API_KEYS } from '@/shared/api';

import type { ChangePasswordPayload } from '@omni/shared/users';

export function useAccountActions() {
  const changePassword = async (payload: ChangePasswordPayload) => {
    await api.patch(API_KEYS.users.password, payload);
  };

  const deleteAccount = async () => {
    await api.delete(API_KEYS.users.account);
  };

  return { changePassword, deleteAccount };
}
