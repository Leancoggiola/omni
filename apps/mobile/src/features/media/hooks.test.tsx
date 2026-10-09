import { act, renderHook, waitFor } from '@testing-library/react-native';
import { SWRConfig } from 'swr';

import { useMediaMutations, useMediaSearch, useMyMediaList } from './hooks';

import type { MediaItem, TmdbSearchResponse } from '@omni/shared/media';
import type { ReactNode } from 'react';

const mockApi = { post: jest.fn(), patch: jest.fn(), delete: jest.fn() };

// Solo keys y buildQueryString reales: el client toca SecureStore. El factory corre antes de que se
// inicialice `mockApi`, por eso delega en funciones.
jest.mock('@/shared/api', () => ({
  ...jest.requireActual('@/shared/api/keys'),
  api: {
    post: (...args: unknown[]) => mockApi.post(...args),
    patch: (...args: unknown[]) => mockApi.patch(...args),
    delete: (...args: unknown[]) => mockApi.delete(...args),
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
const searchResponse: TmdbSearchResponse = {
  page: 1,
  total_pages: 1,
  total_results: 1,
  results: [{ id: 1, media_type: 'movie', title: 'Dune', poster_path: null }],
} as TmdbSearchResponse;
const fetcher = jest.fn((key: string) =>
  Promise.resolve(key.startsWith('/api/media/search') ? searchResponse : server.map(i => ({ ...i })))
);

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
  jest.clearAllMocks();
  server = [item('1', 'to_watch'), item('2', 'to_watch')];
});

describe('useMediaMutations', () => {
  it('dos cambios de estado superpuestos no se pisan (optimista sobre la lista visible)', async () => {
    const first = deferred();
    const second = deferred();
    mockApi.patch.mockImplementation((url: string, body: { status: MediaItem['status'] }) => {
      const id = url.split('/').pop()!;
      return (id === '1' ? first : second).promise.then(() => {
        server = server.map(i => (i.id === id ? { ...i, status: body.status } : i));
      });
    });
    const { result } = await renderList();

    let a!: Promise<void>;
    let b!: Promise<void>;
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

  it('si el cambio de estado falla, vuelve al anterior y rechaza', async () => {
    mockApi.patch.mockRejectedValue(new Error('Sin conexión'));
    const { result } = await renderList();

    await act(async () => {
      await expect(result.current.updateStatus('1', 'watched')).rejects.toThrow('Sin conexión');
    });
    expect(statuses(result.current.list.data)).toEqual(['1:to_watch', '2:to_watch']);
  });

  it('borrar saca el ítem al instante y lo devuelve si falla', async () => {
    const pending = deferred();
    mockApi.delete.mockReturnValue(pending.promise);
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

  it('agregar suma el ítem arriba', async () => {
    const created = item('3', 'watching');
    mockApi.post.mockImplementation(() => {
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

describe('useMediaSearch', () => {
  afterEach(() => jest.useRealTimers());

  it('con menos de 2 caracteres no busca; al escribir, carga durante el debounce y después trae resultados', async () => {
    jest.useFakeTimers();
    const { result, rerender } = renderHook(({ q }: { q: string }) => useMediaSearch(q), {
      wrapper,
      initialProps: { q: 'd' },
    });
    expect(result.current).toMatchObject({ tooShort: true, isLoading: false, results: [] });

    rerender({ q: 'du' });
    expect(result.current).toMatchObject({ tooShort: false, isLoading: true });
    expect(fetcher).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(400);
    });
    jest.useRealTimers();
    await waitFor(() => expect(result.current.results).toHaveLength(1));
    expect(fetcher).toHaveBeenCalledWith('/api/media/search?page=1&query=du&type=multi');
    expect(result.current.isLoading).toBe(false);
  });
});
