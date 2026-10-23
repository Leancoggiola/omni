import { SWRConfig } from 'swr';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useMyMediaList } from '../../../../library/hooks/useMyMediaList';
import { useMediaMutations } from '../useMediaMutations';

import type { MediaItem } from '../../../types';
import type { ReactNode } from 'react';

import { act, renderHook, waitFor } from '@testing-library/react';

const post = vi.fn();
const patch = vi.fn();
const del = vi.fn();

vi.mock('@/shared/api', async importOriginal => ({
  ...(await importOriginal<typeof import('@/shared/api')>()),
  api: {
    post: (...args: unknown[]) => post(...args),
    patch: (...args: unknown[]) => patch(...args),
    delete: (...args: unknown[]) => del(...args),
  },
}));

const item = (id: string, status: MediaItem['status']): MediaItem => ({
  id,
  userId: 'u1',
  tmdbId: Number(id),
  mediaType: 'movie',
  title: `Título ${id}`,
  posterPath: null,
  status,
  createdAt: '',
  updatedAt: '',
});

/** "Servidor": lo que devuelve el GET de la lista. Las mutaciones lo cambian al resolver. */
let server: MediaItem[] = [];
const fetcher = () => Promise.resolve(server.map(i => ({ ...i })));

function deferred() {
  let resolve!: () => void;
  let reject!: (err: Error) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function wrapper({ children }: { children: ReactNode }) {
  return <SWRConfig value={{ provider: () => new Map(), fetcher, dedupingInterval: 0 }}>{children}</SWRConfig>;
}

async function renderList() {
  const hook = renderHook(() => ({ list: useMyMediaList(), ...useMediaMutations() }), { wrapper });
  await waitFor(() => expect(hook.result.current.list.data).toHaveLength(2));
  return hook;
}

const statuses = (items: MediaItem[] | undefined) => items?.map(i => `${i.id}:${i.status}`);

beforeEach(() => {
  vi.clearAllMocks();
  server = [item('1', 'to_watch'), item('2', 'to_watch')];
});

describe('useMediaMutations', () => {
  it('dos cambios de estado superpuestos no se pisan (optimista sobre la lista visible)', async () => {
    const first = deferred();
    const second = deferred();
    patch.mockImplementation((url: string, body: { status: MediaItem['status'] }) => {
      const id = url.split('/').pop()!;
      const pending = id === '1' ? first : second;
      return pending.promise.then(() => {
        server = server.map(i => (i.id === id ? { ...i, status: body.status } : i));
        return server.find(i => i.id === id);
      });
    });
    const { result } = await renderList();

    let a!: Promise<unknown>;
    let b!: Promise<unknown>;
    act(() => {
      a = result.current.updateStatus('1', 'watching');
    });
    act(() => {
      b = result.current.updateStatus('2', 'watched');
    });
    expect(statuses(result.current.list.data)).toEqual(['1:watching', '2:watched']);

    await act(async () => {
      first.resolve();
      await a;
    });
    await act(async () => {
      second.resolve();
      await b;
    });

    await waitFor(() => expect(statuses(result.current.list.data)).toEqual(['1:watching', '2:watched']));
  });

  it('si el cambio de estado falla, vuelve al anterior', async () => {
    patch.mockRejectedValue(new Error('Sin conexión'));
    const { result } = await renderList();

    await act(async () => {
      await expect(result.current.updateStatus('1', 'watched')).rejects.toThrow('Sin conexión');
    });
    expect(statuses(result.current.list.data)).toEqual(['1:to_watch', '2:to_watch']);
  });

  it('borrar saca el ítem al instante y lo devuelve si falla', async () => {
    const pending = deferred();
    del.mockReturnValue(pending.promise);
    const { result } = await renderList();

    let removal!: Promise<void>;
    act(() => {
      removal = result.current.removeFromList('1');
    });
    expect(statuses(result.current.list.data)).toEqual(['2:to_watch']);

    await act(async () => {
      pending.reject(new Error('404'));
      await removal.catch(() => undefined);
    });
    expect(statuses(result.current.list.data)).toEqual(['1:to_watch', '2:to_watch']);
  });

  it('agregar suma el ítem arriba y queda lo que devuelve el servidor', async () => {
    const created = item('3', 'watching');
    post.mockImplementation(() => {
      server = [created, ...server];
      return Promise.resolve(created);
    });
    const { result } = await renderList();

    await act(async () => {
      await result.current.addToList(3, 'movie', 'watching');
    });
    expect(statuses(result.current.list.data)).toEqual(['3:watching', '1:to_watch', '2:to_watch']);
  });
});
