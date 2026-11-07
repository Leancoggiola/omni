import { act, renderHook } from '@testing-library/react-native';
import { SWRConfig } from 'swr';

import { useAdminUserMutations } from './useAdminUserMutations';

import type { ReactNode } from 'react';

const mockApi = { post: jest.fn(), delete: jest.fn() };

jest.mock('@/shared/api', () => ({
  ...jest.requireActual('@/shared/api/keys'),
  api: {
    post: (...args: unknown[]) => mockApi.post(...args),
    delete: (...args: unknown[]) => mockApi.delete(...args),
  },
}));

function wrapper({ children }: { children: ReactNode }) {
  return <SWRConfig value={{ provider: () => new Map() }}>{children}</SWRConfig>;
}

beforeEach(() => jest.clearAllMocks());

describe('useAdminUserMutations', () => {
  it('createUser hace POST a la key de usuarios y devuelve el usuario', async () => {
    mockApi.post.mockResolvedValue({ user: { id: '9' } });
    const { result } = renderHook(() => useAdminUserMutations(), { wrapper });

    let created: unknown;
    await act(async () => {
      created = await result.current.createUser({ username: 'usuario01', name: 'Ana', password: 'password123' });
    });

    expect(mockApi.post).toHaveBeenCalledWith('/api/admin/users', {
      username: 'usuario01',
      name: 'Ana',
      password: 'password123',
    });
    expect(created).toEqual({ id: '9' });
  });

  it('createUser propaga el error de la API', async () => {
    mockApi.post.mockRejectedValue(new Error('Ese usuario ya existe'));
    const { result } = renderHook(() => useAdminUserMutations(), { wrapper });

    await expect(result.current.createUser({ username: 'usuario01', name: 'Ana', password: 'x' })).rejects.toThrow(
      'Ese usuario ya existe'
    );
  });

  it('deleteUser hace DELETE del usuario', async () => {
    mockApi.delete.mockResolvedValue(undefined);
    const { result } = renderHook(() => useAdminUserMutations(), { wrapper });

    await act(async () => result.current.deleteUser('7'));

    expect(mockApi.delete).toHaveBeenCalledWith('/api/admin/users/7');
  });
});
