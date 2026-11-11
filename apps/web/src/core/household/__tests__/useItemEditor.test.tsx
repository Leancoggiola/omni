import { SWRConfig } from 'swr';
import { describe, expect, it, vi } from 'vitest';

import { createMockAuthValue } from '@/__tests__/helpers';
import { SWR_KEYS } from '@/shared/api';

import { useHousehold } from '../useHousehold';
import { useItemEditor } from '../useItemEditor';

import type { HouseholdInfo } from '@omni/shared/household';
import type { ReactNode } from 'react';

import { renderHook, waitFor } from '@testing-library/react';

vi.mock('@/core/auth', () => ({
  useAuth: () => createMockAuthValue({ user: { ...createMockAuthValue().user!, username: 'leo' } }),
}));

const household: HouseholdInfo = {
  id: 'h1',
  pendingInvite: null,
  members: [
    { userId: 'u1', name: 'Leandro', username: 'leo', avatarUrl: null, joinedAt: '2026-01-01T00:00:00.000Z' },
    { userId: 'u2', name: 'Lucía', username: 'lucia', avatarUrl: null, joinedAt: '2026-01-01T00:00:00.000Z' },
  ],
};

function Wrapper({ children }: { children: ReactNode }) {
  const fetcher = (key: string) => (key === SWR_KEYS.household.current ? Promise.resolve(household) : Promise.reject());
  return <SWRConfig value={{ provider: () => new Map(), fetcher, shouldRetryOnError: false }}>{children}</SWRConfig>;
}

describe('useItemEditor', () => {
  it('resuelve a quien editó con el hogar y la sesión', async () => {
    const { result } = renderHook(() => useItemEditor('u1', 'u2'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current).toMatchObject({ kind: 'member', name: 'Lucía' }));
  });

  it('no devuelve editor si editó quien lo creó', async () => {
    const { result } = renderHook(() => ({ editor: useItemEditor('u1', 'u1'), household: useHousehold().household }), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.household).toBeTruthy());
    expect(result.current.editor).toBeUndefined();
  });
});
