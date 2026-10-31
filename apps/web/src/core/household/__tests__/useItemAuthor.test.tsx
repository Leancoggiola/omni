import { SWRConfig } from 'swr';
import { describe, expect, it, vi } from 'vitest';

import { createMockAuthValue } from '@/__tests__/helpers';
import { SWR_KEYS } from '@/shared/api';

import { useItemAuthor } from '../useItemAuthor';

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

function wrapperFor(data: HouseholdInfo | Error) {
  const fetcher = (key: string) =>
    key === SWR_KEYS.household.current && !(data instanceof Error) ? Promise.resolve(data) : Promise.reject(data);
  return function Wrapper({ children }: { children: ReactNode }) {
    return <SWRConfig value={{ provider: () => new Map(), fetcher, shouldRetryOnError: false }}>{children}</SWRConfig>;
  };
}

describe('useItemAuthor', () => {
  it('resuelve al integrante que creó el ítem', async () => {
    const { result } = renderHook(() => useItemAuthor('u2'), { wrapper: wrapperFor(household) });

    await waitFor(() => expect(result.current).toEqual({ kind: 'member', name: 'Lucía', avatarUrl: null }));
  });

  it('reconoce a la propia sesión por su username', async () => {
    const { result } = renderHook(() => useItemAuthor('u1'), { wrapper: wrapperFor(household) });

    await waitFor(() => expect(result.current?.kind).toBe('self'));
  });

  it('un createdById nulo es una cuenta eliminada', async () => {
    const { result } = renderHook(() => useItemAuthor(null), { wrapper: wrapperFor(household) });

    await waitFor(() => expect(result.current?.kind).toBe('deleted'));
  });

  it('mientras el hogar no cargó, o si falla, no hay autor', async () => {
    const { result } = renderHook(() => useItemAuthor('u2'), { wrapper: wrapperFor(new Error('x')) });

    expect(result.current).toBeUndefined();
    await new Promise(resolve => setTimeout(resolve, 20));
    expect(result.current).toBeUndefined();
  });
});
