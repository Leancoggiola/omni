import { act, renderHook, waitFor } from '@testing-library/react-native';
import { SWRConfig } from 'swr';

import { useMediaSearch } from './useMediaSearch';

import type { TmdbSearchResponse } from '@omni/shared/media';
import type { ReactNode } from 'react';

jest.mock('@/shared/api', () => jest.requireActual('@/shared/api/keys'));

const searchResponse: TmdbSearchResponse = {
  page: 1,
  total_pages: 1,
  total_results: 1,
  results: [{ id: 1, media_type: 'movie', title: 'Dune', poster_path: null }],
} as TmdbSearchResponse;
const fetcher = jest.fn(() => Promise.resolve(searchResponse));

function wrapper({ children }: { children: ReactNode }) {
  return <SWRConfig value={{ provider: () => new Map(), fetcher, dedupingInterval: 0 }}>{children}</SWRConfig>;
}

beforeEach(() => {
  jest.clearAllMocks();
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
