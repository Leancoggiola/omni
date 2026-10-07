import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useTodayHolidays } from '../hooks';
import { STALE_DAY_RETRY_MS } from '../hooks/useTodayHolidays/useTodayHolidays';

import { act, renderHook } from '@testing-library/react';

const useSWRImmutable = vi.fn();
const mutate = vi.fn();

vi.mock('swr/immutable', () => ({
  default: (...args: unknown[]) => useSWRImmutable(...args),
}));

vi.mock('../hooks/useToday', () => ({
  useToday: () => '2026-10-07',
}));

const holidays = (date: string) => ({
  date,
  month: date.slice(5, 7),
  day: date.slice(8, 10),
  count: 0,
  sourceUrl: 'https://wikipedia.org',
  items: [],
});

const swrState = (state: { data?: unknown; isLoading?: boolean; error?: unknown }) => ({
  data: undefined,
  isLoading: false,
  error: undefined,
  mutate,
  ...state,
});

describe('useTodayHolidays', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useSWRImmutable.mockReset();
    mutate.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('versiona la key con el día y reintenta errores de forma acotada', () => {
    useSWRImmutable.mockReturnValue(swrState({ isLoading: true }));
    renderHook(() => useTodayHolidays());
    expect(useSWRImmutable).toHaveBeenCalledWith(
      expect.stringContaining('date=2026-10-07'),
      expect.objectContaining({ keepPreviousData: true, shouldRetryOnError: true, errorRetryCount: 3 })
    );
  });

  it('sin datos está cargando y expone el fallback vacío del día', () => {
    useSWRImmutable.mockReturnValue(swrState({ isLoading: true }));
    const { result } = renderHook(() => useTodayHolidays());
    expect(result.current.isLoading).toBe(true);
    expect(result.current.holidays).toMatchObject({ date: '2026-10-07', items: [] });
  });

  it('con datos del día anterior (keepPreviousData) no vuelve al estado de carga', () => {
    useSWRImmutable.mockReturnValue(swrState({ isLoading: true, data: holidays('2026-10-06') }));
    const { result } = renderHook(() => useTodayHolidays());
    expect(result.current.isLoading).toBe(false);
    expect(result.current.holidays.date).toBe('2026-10-06');
  });

  it('si el servidor sigue en el día anterior, vuelve a pedir cada 30 s hasta que cambie', () => {
    useSWRImmutable.mockReturnValue(swrState({ data: holidays('2026-10-06') }));
    const { rerender, unmount } = renderHook(() => useTodayHolidays());

    act(() => {
      vi.advanceTimersByTime(STALE_DAY_RETRY_MS - 1);
    });
    expect(mutate).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(mutate).toHaveBeenCalledTimes(1);

    // La respuesta repite el día anterior: se sigue reintentando.
    act(() => {
      vi.advanceTimersByTime(STALE_DAY_RETRY_MS);
    });
    expect(mutate).toHaveBeenCalledTimes(2);

    // El servidor ya cambió de día: no hay más reintentos.
    useSWRImmutable.mockReturnValue(swrState({ data: holidays('2026-10-07') }));
    rerender();
    act(() => {
      vi.advanceTimersByTime(STALE_DAY_RETRY_MS * 3);
    });
    expect(mutate).toHaveBeenCalledTimes(2);
    unmount();
  });

  it('con el reloj del cliente atrasado o con error no reintenta', () => {
    useSWRImmutable.mockReturnValue(swrState({ data: holidays('2026-10-08') }));
    const { unmount } = renderHook(() => useTodayHolidays());
    act(() => {
      vi.advanceTimersByTime(STALE_DAY_RETRY_MS * 2);
    });
    unmount();

    useSWRImmutable.mockReturnValue(swrState({ data: holidays('2026-10-06'), error: new Error('x') }));
    renderHook(() => useTodayHolidays());
    act(() => {
      vi.advanceTimersByTime(STALE_DAY_RETRY_MS * 2);
    });

    expect(mutate).not.toHaveBeenCalled();
  });

  it('cancela el reintento al desmontar', () => {
    useSWRImmutable.mockReturnValue(swrState({ data: holidays('2026-10-06') }));
    const { unmount } = renderHook(() => useTodayHolidays());
    unmount();
    act(() => {
      vi.advanceTimersByTime(STALE_DAY_RETRY_MS * 2);
    });
    expect(mutate).not.toHaveBeenCalled();
  });
});
