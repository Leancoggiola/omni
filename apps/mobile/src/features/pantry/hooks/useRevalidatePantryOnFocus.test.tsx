import { renderHook, waitFor } from '@testing-library/react-native';
import useSWR, { SWRConfig } from 'swr';

import { API_KEYS } from '@/shared/api';

import { useRevalidatePantryOnFocus } from './useRevalidatePantryOnFocus';

import type { ReactNode } from 'react';
import { trackSWR } from '@/test/swr';

jest.mock('@/shared/api', () => jest.requireActual('@/shared/api/keys'));
jest.mock('@/shared/navigation', () => jest.requireActual('@/shared/navigation/useRevalidateOnFocus'));

let mockFocused = true;
jest.mock('expo-router/react-navigation', () => ({ useIsFocused: () => mockFocused }));

async function setup() {
  const fetcher = jest.fn().mockResolvedValue({ totalProducts: 1 });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <SWRConfig value={{ provider: () => new Map(), fetcher, dedupingInterval: 0 }}>{children}</SWRConfig>
  );
  const view = await renderHook(
    () => {
      useRevalidatePantryOnFocus();
      return trackSWR(useSWR(API_KEYS.pantry.summary));
    },
    { wrapper }
  );
  return { fetcher, ...view };
}

beforeEach(() => {
  mockFocused = true;
});

describe('useRevalidatePantryOnFocus', () => {
  it('al montar no pide de más', async () => {
    const { fetcher, result } = await setup();

    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('revalida al volver a la pestaña, y no al salir', async () => {
    const { fetcher, result, rerender } = await setup();
    await waitFor(() => expect(result.current.data).toBeDefined());

    mockFocused = false;
    await rerender({});
    expect(fetcher).toHaveBeenCalledTimes(1);

    mockFocused = true;
    await rerender({});
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
    expect(fetcher).toHaveBeenLastCalledWith(API_KEYS.pantry.summary);
  });
});
