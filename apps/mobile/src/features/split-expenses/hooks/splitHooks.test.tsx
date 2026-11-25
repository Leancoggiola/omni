import { renderHook, waitFor, act } from '@testing-library/react-native';
import { SWRConfig } from 'swr';

import { API_KEYS } from '@/shared/api';

import { gatheringDetail } from '../fixtures';
import { useGathering } from './useGathering';
import { useGatherings } from './useGatherings';
import { useSplitBalance } from './useSplitBalance';
import { useSplitExpensesMutations } from './useSplitExpensesMutations';
import { useSplitFriends } from './useSplitFriends';

import type { ReactNode } from 'react';

const mockApi = { post: jest.fn(), patch: jest.fn(), delete: jest.fn() };

jest.mock('@/shared/api', () => ({
  ...jest.requireActual('@/shared/api/keys'),
  buildQueryString: jest.requireActual('@omni/shared/api').buildQueryString,
  api: {
    post: (...args: unknown[]) => mockApi.post(...args),
    patch: (...args: unknown[]) => mockApi.patch(...args),
    delete: (...args: unknown[]) => mockApi.delete(...args),
  },
}));

const { splitExpenses } = API_KEYS;
const LIST_KEY = `${splitExpenses.gatherings}?limit=50&page=1`;

const fetcher = jest.fn();

function Wrapper({ children }: { children: ReactNode }) {
  return <SWRConfig value={{ provider: () => new Map(), fetcher, dedupingInterval: 0 }}>{children}</SWRConfig>;
}

/** Todas las lecturas del módulo montadas a la vez, con las escrituras: lo que cada una vuelve a pedir se ve en `fetcher`. */
function useEverything() {
  const list = useGatherings();
  const detail = useGathering('g1');
  const balance = useSplitBalance();
  const friends = useSplitFriends();
  const mutations = useSplitExpensesMutations();
  return {
    mutations,
    gatherings: list.gatherings,
    detail: detail.gathering,
    balance: balance.balance,
    friends: friends.friends,
  };
}

const renderEverything = async () => {
  const hook = await renderHook(useEverything, { wrapper: Wrapper });
  await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(4));
  fetcher.mockClear();
  return hook;
};

const refetched = () => fetcher.mock.calls.map(call => call[0]).sort();

beforeEach(() => {
  jest.clearAllMocks();
  fetcher.mockImplementation(async (key: string) => (key === LIST_KEY ? { items: [] } : undefined));
});

describe('lecturas', () => {
  it('piden las keys del módulo', async () => {
    await renderHook(useEverything, { wrapper: Wrapper });

    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(4));
    expect(refetched()).toEqual(
      [LIST_KEY, splitExpenses.gathering('g1'), splitExpenses.balance, splitExpenses.friends].sort()
    );
  });

  it('sin id no pide el detalle', async () => {
    await renderHook(() => useGathering(undefined), { wrapper: Wrapper });

    expect(fetcher).not.toHaveBeenCalled();
  });
});

describe('useSplitExpensesMutations', () => {
  it('agregar un gasto guarda el detalle recibido y revalida el resto del módulo', async () => {
    const updated = gatheringDetail({ totalAmount: 99 });
    mockApi.post.mockResolvedValue(updated);
    const { result } = await renderEverything();

    await act(async () => {
      await result.current.mutations.addExpense('g1', { participantId: 'p0', amount: 99 });
    });

    expect(mockApi.post).toHaveBeenCalledWith(splitExpenses.gatheringExpenses('g1'), {
      participantId: 'p0',
      amount: 99,
    });
    expect(result.current.detail).toEqual(updated);
    expect(refetched()).toEqual([LIST_KEY, splitExpenses.balance, splitExpenses.friends].sort());
  });

  it('saldar manda isSettled', async () => {
    mockApi.patch.mockResolvedValue(gatheringDetail({ isSettled: true }));
    const { result } = await renderEverything();

    await act(async () => {
      await result.current.mutations.setGatheringSettled('g1', true);
    });

    expect(mockApi.patch).toHaveBeenCalledWith(splitExpenses.gatheringSettled('g1'), { isSettled: true });
    expect(result.current.detail?.isSettled).toBe(true);
  });

  it('borrar una juntada no vuelve a pedir su detalle', async () => {
    mockApi.delete.mockResolvedValue(undefined);
    const { result } = await renderEverything();

    await act(async () => {
      await result.current.mutations.deleteGathering('g1');
    });

    expect(mockApi.delete).toHaveBeenCalledWith(splitExpenses.gathering('g1'));
    expect(refetched()).not.toContain(splitExpenses.gathering('g1'));
  });

  it('borrar un gasto revalida también el detalle', async () => {
    mockApi.delete.mockResolvedValue(undefined);
    const { result } = await renderEverything();

    await act(async () => {
      await result.current.mutations.deleteExpense('g1', 'e1');
    });

    expect(mockApi.delete).toHaveBeenCalledWith(splitExpenses.gatheringExpense('g1', 'e1'));
    expect(refetched()).toContain(splitExpenses.gathering('g1'));
  });

  it('las escrituras de amigos usan sus rutas', async () => {
    mockApi.post.mockResolvedValue({});
    mockApi.patch.mockResolvedValue({});
    mockApi.delete.mockResolvedValue(undefined);
    const { result } = await renderEverything();

    await act(async () => {
      await result.current.mutations.createFriend({ name: 'Nico', alias: 'nico.paz' });
      await result.current.mutations.updateFriend('f1', { name: 'Nico' });
      await result.current.mutations.deleteFriend('f1');
    });

    expect(mockApi.post).toHaveBeenCalledWith(splitExpenses.friends, { name: 'Nico', alias: 'nico.paz' });
    expect(mockApi.patch).toHaveBeenCalledWith(splitExpenses.friend('f1'), { name: 'Nico' });
    expect(mockApi.delete).toHaveBeenCalledWith(splitExpenses.friend('f1'));
  });

  it('propaga el error de la API', async () => {
    mockApi.post.mockRejectedValue(new Error('La juntada está saldada'));
    const { result } = await renderEverything();

    await expect(result.current.mutations.addExpense('g1', { participantId: 'p0', amount: 1 })).rejects.toThrow(
      'La juntada está saldada'
    );
  });

  it('crear una juntada devuelve el detalle creado', async () => {
    const created = gatheringDetail({ id: 'g2' });
    mockApi.post.mockResolvedValue(created);
    const { result } = await renderEverything();

    await act(async () => {
      await expect(
        result.current.mutations.createGathering({ name: 'Cena', date: '2026-10-18', participants: [{ name: 'Nico' }] })
      ).resolves.toEqual(created);
    });
  });
});
