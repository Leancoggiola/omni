import { SWRConfig } from 'swr';
import { afterEach, describe, expect, it, type Mock, vi } from 'vitest';

import { useMyMediaList } from '../hooks/useMyMediaList';

import type { MediaItem } from '../types';
import type { ReactNode } from 'react';

import { DEFAULT_MEDIA_FILTERS, MEDIA_LIST_REFRESH_MS } from '@omni/shared/media';
import { act, renderHook, waitFor } from '@testing-library/react';

const item = (id: string, createdById: string): MediaItem => ({
  id,
  createdById,
  tmdbId: Number(id),
  mediaType: 'movie',
  title: `Título ${id}`,
  posterPath: null,
  status: 'to_watch',
  createdAt: '',
  updatedAt: '',
});

function wrapperWith(fetcher: Mock) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <SWRConfig
        value={{
          provider: () => new Map(),
          fetcher,
          dedupingInterval: 0,
          focusThrottleInterval: 0,
          revalidateOnFocus: false,
        }}
      >
        {children}
      </SWRConfig>
    );
  };
}

describe('useMyMediaList', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('expone la lista completa y la filtrada', async () => {
    const fetcher = vi.fn().mockResolvedValue([item('1', 'u1'), item('2', 'u2')]);
    const { result } = renderHook(() => useMyMediaList({ ...DEFAULT_MEDIA_FILTERS, status: 'watched' }), {
      wrapper: wrapperWith(fetcher),
    });

    await waitFor(() => expect(result.current.allItems).toHaveLength(2));
    expect(result.current.data).toHaveLength(0);
    expect(fetcher).toHaveBeenCalledWith('/api/media/list');
  });

  it('expone el error del fetch', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('Sin conexión'));
    const { result } = renderHook(() => useMyMediaList(), { wrapper: wrapperWith(fetcher) });

    await waitFor(() => expect(result.current.error).toEqual(new Error('Sin conexión')));
  });

  it('refresca la lista cada MEDIA_LIST_REFRESH_MS y muestra lo que agregó la otra persona', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce([item('1', 'u1')])
      .mockResolvedValue([item('1', 'u1'), item('2', 'u2')]);
    const { result } = renderHook(() => useMyMediaList(), { wrapper: wrapperWith(fetcher) });

    await waitFor(() => expect(result.current.allItems).toHaveLength(1));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(MEDIA_LIST_REFRESH_MS + 100);
    });

    await waitFor(() => expect(result.current.allItems).toHaveLength(2));
    expect(result.current.allItems?.[1]?.createdById).toBe('u2');
  });

  it('revalida al volver el foco', async () => {
    const fetcher = vi.fn().mockResolvedValue([item('1', 'u1')]);
    renderHook(() => useMyMediaList(), { wrapper: wrapperWith(fetcher) });
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));

    act(() => {
      window.dispatchEvent(new Event('focus'));
    });

    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
  });
});
