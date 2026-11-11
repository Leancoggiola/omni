import { SWRConfig } from 'swr';
import useSWRImmutable from 'swr/immutable';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SWR_KEYS } from '@/shared/api';

import { useHouseholdActions } from '../hooks/useHouseholdActions';

import type { ReactNode } from 'react';

import { act, renderHook, waitFor } from '@testing-library/react';

const post = vi.fn();
const del = vi.fn();

vi.mock('@/shared/api', async importOriginal => ({
  ...(await importOriginal<typeof import('@/shared/api')>()),
  api: { post: (...args: unknown[]) => post(...args), delete: (...args: unknown[]) => del(...args) },
}));

const fetches: string[] = [];
const fetcher = (key: string) => {
  fetches.push(key);
  return Promise.resolve([]);
};

function wrapper({ children }: { children: ReactNode }) {
  return <SWRConfig value={{ provider: () => new Map(), fetcher }}>{children}</SWRConfig>;
}

function useActionsAndMediaList() {
  const { data } = useSWRImmutable(SWR_KEYS.media.list);
  return { ...useHouseholdActions(), media: data };
}

describe('useHouseholdActions', () => {
  beforeEach(() => {
    post.mockReset();
    del.mockReset();
    fetches.length = 0;
  });

  it('createInvite devuelve el código y vuelve a pedir el hogar', async () => {
    const invite = { id: 'i1', code: 'K7M2QX4P', expiresAt: '2026-11-02T14:30:00.000Z' };
    post.mockResolvedValue(invite);
    const { result } = renderHook(() => useHouseholdActions(), { wrapper });

    await expect(result.current.createInvite()).resolves.toEqual(invite);

    expect(post).toHaveBeenCalledWith(SWR_KEYS.household.invite);
  });

  it('revokeInvite llama al DELETE de la invitación', async () => {
    del.mockResolvedValue(undefined);
    const { result } = renderHook(() => useHouseholdActions(), { wrapper });

    await act(() => result.current.revokeInvite());

    expect(del).toHaveBeenCalledWith(SWR_KEYS.household.invite);
  });

  it('previewInvite manda el código y no toca ninguna cache', async () => {
    post.mockResolvedValue({ inviter: { name: 'Lucía' } });
    const { result } = renderHook(() => useHouseholdActions(), { wrapper });

    await result.current.previewInvite('K7M2QX4P');

    expect(post).toHaveBeenCalledWith(SWR_KEYS.household.invitePreview, { code: 'K7M2QX4P' });
    expect(fetches).toEqual([]);
  });

  it('acceptInvite invalida la lista de media', async () => {
    post.mockResolvedValue({});
    const { result } = renderHook(() => useActionsAndMediaList(), { wrapper });
    await waitFor(() => expect(result.current.media).toEqual([]));
    fetches.length = 0;

    await act(() => result.current.acceptInvite('K7M2QX4P'));

    expect(post).toHaveBeenCalledWith(SWR_KEYS.household.inviteAccept, { code: 'K7M2QX4P' });
    await waitFor(() => expect(fetches).toContain(SWR_KEYS.media.list));
  });

  it('leaveHousehold invalida la lista de media', async () => {
    post.mockResolvedValue({});
    const { result } = renderHook(() => useActionsAndMediaList(), { wrapper });
    await waitFor(() => expect(result.current.media).toEqual([]));
    fetches.length = 0;

    await act(() => result.current.leaveHousehold());

    expect(post).toHaveBeenCalledWith(SWR_KEYS.household.leave);
    await waitFor(() => expect(fetches).toContain(SWR_KEYS.media.list));
  });

  it('si el POST falla no invalida nada y propaga el error', async () => {
    post.mockRejectedValue(new Error('x'));
    const { result } = renderHook(() => useActionsAndMediaList(), { wrapper });
    await waitFor(() => expect(result.current.media).toEqual([]));
    fetches.length = 0;

    await expect(result.current.leaveHousehold()).rejects.toThrow('x');

    expect(fetches).toEqual([]);
  });
});
