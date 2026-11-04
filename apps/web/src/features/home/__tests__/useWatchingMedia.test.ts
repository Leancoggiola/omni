import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useWatchingMedia } from '../hooks/useWatchingMedia';

import type { MediaItem } from '@omni/shared/media';

import { MEDIA_LIST_REFRESH_MS } from '@omni/shared/media';
import { renderHook } from '@testing-library/react';

const useSWR = vi.fn();
const mutate = vi.fn();

vi.mock('swr', () => ({
  default: (...args: unknown[]) => useSWR(...args),
}));

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

const swrState = (state: { data?: MediaItem[]; isLoading?: boolean; error?: unknown }) => ({
  data: undefined,
  isLoading: false,
  error: undefined,
  mutate,
  ...state,
});

describe('useWatchingMedia', () => {
  beforeEach(() => {
    useSWR.mockReset();
  });

  it('pide la lista compartida y la refresca periódicamente', () => {
    useSWR.mockReturnValue(swrState({ isLoading: true }));
    renderHook(() => useWatchingMedia());
    expect(useSWR).toHaveBeenCalledWith(
      '/api/media/list',
      expect.objectContaining({ refreshInterval: MEDIA_LIST_REFRESH_MS, revalidateOnFocus: true })
    );
  });

  it('sin datos está cargando y no hay ítems', () => {
    useSWR.mockReturnValue(swrState({ isLoading: true }));
    const { result } = renderHook(() => useWatchingMedia());
    expect(result.current).toMatchObject({ isLoading: true, items: [] });
  });

  it('con datos viejos mientras revalida no vuelve al estado de carga', () => {
    useSWR.mockReturnValue(swrState({ isLoading: true, data: [media('1', 'watching', '2026-01-01')] }));
    const { result } = renderHook(() => useWatchingMedia());
    expect(result.current.isLoading).toBe(false);
    expect(result.current.items).toHaveLength(1);
  });

  it('devuelve hasta 3 ítems en "Viendo", los más recientes primero', () => {
    useSWR.mockReturnValue(
      swrState({
        data: [
          media('1', 'watching', '2026-01-01'),
          media('2', 'watched', '2026-06-01'),
          media('3', 'watching', '2026-03-01'),
          media('4', 'watching', '2026-02-01'),
          media('5', 'watching', '2026-04-01'),
        ],
      })
    );
    const { result } = renderHook(() => useWatchingMedia());
    expect(result.current.items.map(i => i.id)).toEqual(['5', '3', '4']);
  });

  it('expone el error y mutate para reintentar', () => {
    const error = new Error('x');
    useSWR.mockReturnValue(swrState({ error }));
    const { result } = renderHook(() => useWatchingMedia());
    expect(result.current.error).toBe(error);
    expect(result.current.mutate).toBe(mutate);
  });
});
