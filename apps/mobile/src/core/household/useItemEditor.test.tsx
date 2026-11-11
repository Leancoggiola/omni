import { renderHook, waitFor } from '@testing-library/react-native';
import { SWRConfig } from 'swr';

import { useHousehold } from './useHousehold';
import { useItemEditor } from './useItemEditor';

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

describe('useItemEditor', () => {
  it('resuelve a quien editó con el hogar y la sesión', async () => {
    const fetcher = jest.fn().mockResolvedValue(HOUSEHOLD);
    const { result } = renderHook(() => useItemEditor('u1', 'u2'), { wrapper: wrapperWith(fetcher) });

    await waitFor(() => expect(result.current).toMatchObject({ kind: 'member', name: 'Lucía' }));
  });

  it('no devuelve editor si editó quien lo creó', async () => {
    const fetcher = jest.fn().mockResolvedValue(HOUSEHOLD);
    const { result } = renderHook(() => ({ editor: useItemEditor('u1', 'u1'), household: useHousehold().household }), {
      wrapper: wrapperWith(fetcher),
    });

    await waitFor(() => expect(result.current.household).toBeTruthy());
    expect(result.current.editor).toBeUndefined();
  });
});
