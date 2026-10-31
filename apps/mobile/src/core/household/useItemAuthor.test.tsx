import { renderHook, waitFor } from '@testing-library/react-native';
import { SWRConfig } from 'swr';

import { useItemAuthor } from './useItemAuthor';

import type { HouseholdInfo } from '@omni/shared/household';
import type { ReactNode } from 'react';

jest.mock('@/shared/api', () => jest.requireActual('@/shared/api/keys'));
jest.mock('@/core/auth', () => ({ useAuth: () => ({ user: { username: 'leo' } }) }));

const HOUSEHOLD: HouseholdInfo = {
  id: 'h1',
  pendingInvite: null,
  members: [
    { userId: 'u1', name: 'Leandro', username: 'leo', avatarUrl: null, joinedAt: '' },
    { userId: 'u2', name: 'Lucía', username: 'lucia', avatarUrl: null, joinedAt: '' },
  ],
};

function wrapperWith(fetcher: jest.Mock) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <SWRConfig value={{ provider: () => new Map(), fetcher, dedupingInterval: 0, shouldRetryOnError: false }}>
        {children}
      </SWRConfig>
    );
  };
}

describe('useItemAuthor', () => {
  it('pide el hogar de /api/household y resuelve al integrante', async () => {
    const fetcher = jest.fn().mockResolvedValue(HOUSEHOLD);
    const { result } = renderHook(() => useItemAuthor('u2'), { wrapper: wrapperWith(fetcher) });

    await waitFor(() => expect(result.current).toEqual({ kind: 'member', name: 'Lucía', avatarUrl: null }));
    expect(fetcher).toHaveBeenCalledWith('/api/household');
  });

  it('reconoce a la propia sesión por su username', async () => {
    const fetcher = jest.fn().mockResolvedValue(HOUSEHOLD);
    const { result } = renderHook(() => useItemAuthor('u1'), { wrapper: wrapperWith(fetcher) });

    await waitFor(() => expect(result.current?.kind).toBe('self'));
  });

  it('un createdById nulo es una cuenta eliminada', async () => {
    const fetcher = jest.fn().mockResolvedValue(HOUSEHOLD);
    const { result } = renderHook(() => useItemAuthor(null), { wrapper: wrapperWith(fetcher) });

    await waitFor(() => expect(result.current?.kind).toBe('deleted'));
  });

  it('si el hogar falla no hay autor', async () => {
    const fetcher = jest.fn().mockRejectedValue(new Error('x'));
    const { result } = renderHook(() => useItemAuthor('u2'), { wrapper: wrapperWith(fetcher) });

    await waitFor(() => expect(fetcher).toHaveBeenCalled());
    expect(result.current).toBeUndefined();
  });
});
