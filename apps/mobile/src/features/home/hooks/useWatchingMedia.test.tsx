import { renderHook, waitFor } from '@testing-library/react-native';
import { SWRConfig } from 'swr';

import { useWatchingMedia } from './useWatchingMedia';

import { MEDIA_LIST_REFRESH_MS } from '@omni/shared/media';

import type { MediaItem } from '@omni/shared/media';
import type { ReactNode } from 'react';

let mockFocused = true;
jest.mock('expo-router/react-navigation', () => ({ useIsFocused: () => mockFocused }));
jest.mock('@/shared/api', () => jest.requireActual('@/shared/api/keys'));

const media = (id: string, status: MediaItem['status'], updatedAt: string): MediaItem => ({
  id,
  createdById: 'u1',
  tmdbId: Number(id),
  mediaType: 'tv',
  title: `Título ${id}`,
  posterPath: null,
  status,
  createdAt: '',
  updatedAt,
});

const LIST = [
  media('1', 'watching', '2026-01-01'),
  media('2', 'watched', '2026-06-01'),
  media('3', 'watching', '2026-03-01'),
  media('4', 'watching', '2026-02-01'),
  media('5', 'watching', '2026-04-01'),
];

function wrapperWith(fetcher: jest.Mock) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <SWRConfig value={{ provider: () => new Map(), fetcher, dedupingInterval: 0 }}>{children}</SWRConfig>;
  };
}

describe('useWatchingMedia', () => {
  beforeEach(() => {
    mockFocused = true;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('pide la lista y devuelve hasta 3 ítems en "Viendo", los más recientes primero', async () => {
    const fetcher = jest.fn().mockResolvedValue(LIST);
    const { result } = renderHook(() => useWatchingMedia(), { wrapper: wrapperWith(fetcher) });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.items).toEqual([]);
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(fetcher).toHaveBeenCalledWith('/api/media/list');
    expect(result.current.items.map(i => i.id)).toEqual(['5', '3', '4']);
  });

  it('expone el error y no lo disfraza de lista vacía', async () => {
    const fetcher = jest.fn().mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useWatchingMedia(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <SWRConfig value={{ provider: () => new Map(), fetcher, shouldRetryOnError: false }}>{children}</SWRConfig>
      ),
    });

    await waitFor(() => expect(result.current.error).toBeDefined());
    expect(result.current.isLoading).toBe(false);
  });

  it('refresca la lista cada MEDIA_LIST_REFRESH_MS solo con la pantalla enfocada', async () => {
    jest.useFakeTimers();
    const fetcher = jest.fn().mockResolvedValue(LIST);
    const { rerender } = renderHook(() => useWatchingMedia(), { wrapper: wrapperWith(fetcher) });
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));

    mockFocused = false;
    rerender({});
    await jest.advanceTimersByTimeAsync(MEDIA_LIST_REFRESH_MS * 2);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
