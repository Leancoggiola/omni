import { renderHook, waitFor } from '@testing-library/react-native';
import { SWRConfig } from 'swr';

import { useAdminUsers } from './useAdminUsers';

import type { ReactNode } from 'react';

jest.mock('@/shared/api', () => jest.requireActual('@/shared/api/keys'));

const wrapperWith = (fetcher: jest.Mock) =>
  function Wrapper({ children }: { children: ReactNode }) {
    return <SWRConfig value={{ provider: () => new Map(), fetcher, dedupingInterval: 0 }}>{children}</SWRConfig>;
  };

describe('useAdminUsers', () => {
  it('trae los usuarios de API_KEYS.admin.users', async () => {
    const users = [{ id: '1', username: 'admin', name: 'Admin', email: null, role: 'ADMIN', createdAt: '' }];
    const fetcher = jest.fn().mockResolvedValue({ users });
    const { result } = renderHook(() => useAdminUsers(), { wrapper: wrapperWith(fetcher) });

    await waitFor(() => expect(result.current.users).toEqual(users));
    expect(fetcher).toHaveBeenCalledWith('/api/admin/users');
  });

  it('expone el error', async () => {
    const fetcher = jest.fn().mockRejectedValue(new Error('Sin conexión'));
    const { result } = renderHook(() => useAdminUsers(), { wrapper: wrapperWith(fetcher) });

    await waitFor(() => expect(result.current.error).toEqual(new Error('Sin conexión')));
    expect(result.current.users).toEqual([]);
  });
});
