import { renderHook, waitFor } from '@testing-library/react-native';
import { SWRConfig } from 'swr';

import { useMyMediaList } from './useMyMediaList';

import type { MediaItem } from '@omni/shared/media';
import type { ReactNode } from 'react';

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
});
