import { act, renderHook, waitFor } from '@testing-library/react-native';
import { SWRConfig } from 'swr';
import useSWRImmutable from 'swr/immutable';

import { api } from '@/shared/api';
import { API_KEYS } from '@/shared/api/keys';

import { useHouseholdActions } from './useHouseholdActions';

import type { ReactNode } from 'react';

jest.mock('@/shared/api', () => ({
  api: { post: jest.fn(), delete: jest.fn() },
  API_KEYS: jest.requireActual('@/shared/api/keys').API_KEYS,
}));

const mockPost = jest.mocked(api.post);
const mockDelete = jest.mocked(api.delete);
const mockFetcher = jest.fn();

function wrapper({ children }: { children: ReactNode }) {
  return (
    <SWRConfig value={{ provider: () => new Map(), fetcher: mockFetcher, dedupingInterval: 0 }}>{children}</SWRConfig>
  );
}

function useActionsAndMediaList() {
  const { data } = useSWRImmutable(API_KEYS.media.list);
  return { ...useHouseholdActions(), media: data };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockFetcher.mockResolvedValue([]);
});

describe('useHouseholdActions', () => {
  it('createInvite devuelve el código recién generado', async () => {
    const invite = { id: 'i1', code: 'K7M2QX4P', expiresAt: '2026-11-02T14:30:00.000Z' };
    mockPost.mockResolvedValue(invite);
    const { result } = renderHook(() => useHouseholdActions(), { wrapper });

    await expect(result.current.createInvite()).resolves.toEqual(invite);

    expect(mockPost).toHaveBeenCalledWith(API_KEYS.household.invite);
  });

  it('revokeInvite llama al DELETE de la invitación', async () => {
    mockDelete.mockResolvedValue(undefined);
    const { result } = renderHook(() => useHouseholdActions(), { wrapper });

    await act(() => result.current.revokeInvite());

    expect(mockDelete).toHaveBeenCalledWith(API_KEYS.household.invite);
  });

  it('previewInvite manda el código sin tocar caches', async () => {
    mockPost.mockResolvedValue({ inviter: { name: 'Lucía' } });
    const { result } = renderHook(() => useHouseholdActions(), { wrapper });

    await result.current.previewInvite('K7M2QX4P');

    expect(mockPost).toHaveBeenCalledWith(API_KEYS.household.invitePreview, { code: 'K7M2QX4P' });
    expect(mockFetcher).not.toHaveBeenCalled();
  });

  it('acceptInvite invalida la lista de media', async () => {
    mockPost.mockResolvedValue({});
    const { result } = renderHook(() => useActionsAndMediaList(), { wrapper });
    await waitFor(() => expect(result.current.media).toEqual([]));
    mockFetcher.mockClear();

    await act(() => result.current.acceptInvite('K7M2QX4P'));

    expect(mockPost).toHaveBeenCalledWith(API_KEYS.household.inviteAccept, { code: 'K7M2QX4P' });
    await waitFor(() => expect(mockFetcher).toHaveBeenCalledWith(API_KEYS.media.list));
  });

  it('leaveHousehold invalida la lista de media', async () => {
    mockPost.mockResolvedValue({});
    const { result } = renderHook(() => useActionsAndMediaList(), { wrapper });
    await waitFor(() => expect(result.current.media).toEqual([]));
    mockFetcher.mockClear();

    await act(() => result.current.leaveHousehold());

    expect(mockPost).toHaveBeenCalledWith(API_KEYS.household.leave);
    await waitFor(() => expect(mockFetcher).toHaveBeenCalledWith(API_KEYS.media.list));
  });

  it('si el POST falla no invalida nada y propaga el error', async () => {
    mockPost.mockRejectedValue(new Error('x'));
    const { result } = renderHook(() => useActionsAndMediaList(), { wrapper });
    await waitFor(() => expect(result.current.media).toEqual([]));
    mockFetcher.mockClear();

    await expect(result.current.leaveHousehold()).rejects.toThrow('x');

    expect(mockFetcher).not.toHaveBeenCalled();
  });
});
