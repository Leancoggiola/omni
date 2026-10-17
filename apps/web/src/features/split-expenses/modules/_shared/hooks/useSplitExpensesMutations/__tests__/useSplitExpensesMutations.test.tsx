import useSWR, { SWRConfig } from 'swr';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SWR_KEYS } from '@/shared/api';

import { useSplitExpensesMutations } from '../useSplitExpensesMutations';

import type { ReactNode } from 'react';

import { act, renderHook, waitFor } from '@testing-library/react';

const post = vi.fn();
const del = vi.fn();

vi.mock('@/shared/api', async importOriginal => ({
  ...(await importOriginal<typeof import('@/shared/api')>()),
  api: {
    post: (...args: unknown[]) => post(...args),
    delete: (...args: unknown[]) => del(...args),
  },
}));

const GATHERING_KEY = SWR_KEYS.splitExpenses.gathering('g1');
const LIST_KEY = `${SWR_KEYS.splitExpenses.gatherings}?limit=50&page=1`;

const fetches: string[] = [];
let gate: Promise<void> | null = null;

/** Responde con la key; si hay una `gate` abierta, la respuesta espera para poder mirar la caché con el GET en vuelo. */
const fetcher = async (key: string) => {
  fetches.push(key);
  if (gate) await gate;
  return { key };
};

const wrapper = ({ children }: { children: ReactNode }) => (
  <SWRConfig value={{ fetcher, provider: () => new Map(), dedupingInterval: 0 }}>{children}</SWRConfig>
);

const renderMutations = () =>
  renderHook(
    () => ({
      list: useSWR(LIST_KEY),
      detail: useSWR(GATHERING_KEY),
      digest: useSWR(SWR_KEYS.notifications.digest),
      mutations: useSplitExpensesMutations(),
    }),
    { wrapper }
  );

describe('useSplitExpensesMutations', () => {
  beforeEach(() => {
    fetches.length = 0;
    gate = null;
    post.mockReset().mockResolvedValue({});
    del.mockReset().mockResolvedValue(undefined);
  });

  it('al agregar un gasto revalida la lista y la juntada una sola vez cada una', async () => {
    const { result } = renderMutations();
    await waitFor(() => expect(result.current.detail.data).toBeDefined());
    fetches.length = 0;

    await act(() => result.current.mutations.addGatheringExpense('g1', { participantId: 'p1', amount: 10 } as never));

    expect(fetches.filter(key => key === GATHERING_KEY)).toHaveLength(1);
    expect(fetches.filter(key => key === LIST_KEY)).toHaveLength(1);
  });

  it('revalidar no vacía la data visible', async () => {
    const { result } = renderMutations();
    await waitFor(() => expect(result.current.detail.data).toBeDefined());

    let release!: () => void;
    gate = new Promise<void>(resolve => (release = resolve));
    let pending!: Promise<void>;
    act(() => {
      pending = result.current.mutations.deleteGatheringExpense('g1', 'e1');
    });

    await waitFor(() => expect(fetches.filter(key => key === GATHERING_KEY)).toHaveLength(2));
    expect(result.current.detail.data).toEqual({ key: GATHERING_KEY });
    expect(result.current.list.data).toEqual({ key: LIST_KEY });

    release();
    await act(() => pending);
    expect(result.current.detail.data).toEqual({ key: GATHERING_KEY });
  });

  it('crear una juntada revalida la lista y el digest de notificaciones', async () => {
    const { result } = renderMutations();
    await waitFor(() => expect(result.current.digest.data).toBeDefined());
    fetches.length = 0;

    await act(() => result.current.mutations.createGathering({} as never));

    expect(post).toHaveBeenCalledWith(SWR_KEYS.splitExpenses.gatherings, {});
    expect(fetches.filter(key => key === LIST_KEY)).toHaveLength(1);
    expect(fetches.filter(key => key === SWR_KEYS.notifications.digest)).toHaveLength(1);
  });

  it('borrar una juntada no vuelve a pedir su detalle, que ya no existe', async () => {
    const { result } = renderMutations();
    await waitFor(() => expect(result.current.detail.data).toBeDefined());
    fetches.length = 0;

    await act(() => result.current.mutations.deleteGathering('g1'));

    expect(del).toHaveBeenCalledWith(GATHERING_KEY);
    expect(fetches.filter(key => key === GATHERING_KEY)).toHaveLength(0);
    expect(fetches.filter(key => key === LIST_KEY)).toHaveLength(1);
  });
});
