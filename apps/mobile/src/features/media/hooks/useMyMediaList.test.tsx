import { act, renderHook, waitFor } from '@testing-library/react-native';
import { SWRConfig } from 'swr';

import { useMyMediaList } from './useMyMediaList';

import { MEDIA_LIST_REFRESH_MS } from '@omni/shared/media';

import type { MediaItem } from '@omni/shared/media';
import type { ReactNode } from 'react';

let mockFocused = true;
jest.mock('@react-navigation/native', () => ({ useIsFocused: () => mockFocused }));
jest.mock('@/shared/api', () => jest.requireActual('@/shared/api/keys'));

const LIST: MediaItem[] = [
  {
    id: '1',
    createdById: 'u1',
    tmdbId: 1,
    mediaType: 'movie',
    title: 'Título 1',
    posterPath: null,
    status: 'to_watch',
    createdAt: '',
    updatedAt: '',
  },
];

function wrapperWith(fetcher: jest.Mock) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <SWRConfig value={{ provider: () => new Map(), fetcher, dedupingInterval: 0 }}>{children}</SWRConfig>;
  };
}

describe('useMyMediaList', () => {
  beforeEach(() => {
    mockFocused = true;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('trae la lista completa de una sola key', async () => {
    const fetcher = jest.fn().mockResolvedValue(LIST);
    const { result } = renderHook(() => useMyMediaList(), { wrapper: wrapperWith(fetcher) });

    await waitFor(() => expect(result.current.data).toEqual(LIST));
    expect(fetcher).toHaveBeenCalledWith('/api/media/list');
  });

  it('expone el error del fetch', async () => {
    const fetcher = jest.fn().mockRejectedValue(new Error('Sin conexión'));
    const { result } = renderHook(() => useMyMediaList(), { wrapper: wrapperWith(fetcher) });

    await waitFor(() => expect(result.current.error).toEqual(new Error('Sin conexión')));
  });

  it('refresca la lista cada MEDIA_LIST_REFRESH_MS y muestra lo que agregó la otra persona', async () => {
    jest.useFakeTimers({ advanceTimers: true });
    const other = { ...LIST[0]!, id: '2', createdById: 'u2' };
    const fetcher = jest
      .fn()
      .mockResolvedValueOnce(LIST)
      .mockResolvedValue([...LIST, other]);
    const { result } = renderHook(() => useMyMediaList(), { wrapper: wrapperWith(fetcher) });

    await waitFor(() => expect(result.current.data).toEqual(LIST));
    await act(async () => {
      await jest.advanceTimersByTimeAsync(MEDIA_LIST_REFRESH_MS + 100);
    });

    await waitFor(() => expect(result.current.data).toHaveLength(2));
    expect(result.current.data?.[1]?.createdById).toBe('u2');
  });

  it('no refresca con la pantalla fuera de foco', async () => {
    jest.useFakeTimers({ advanceTimers: true });
    mockFocused = false;
    const fetcher = jest.fn().mockResolvedValue(LIST);
    const { result } = renderHook(() => useMyMediaList(), { wrapper: wrapperWith(fetcher) });

    await waitFor(() => expect(result.current.data).toEqual(LIST));
    await act(async () => {
      await jest.advanceTimersByTimeAsync(MEDIA_LIST_REFRESH_MS * 3);
    });

    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
