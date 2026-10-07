import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useHolidayCarousel } from '../components/HolidaysCard/utils';

import { act, renderHook } from '@testing-library/react';

describe('useHolidayCarousel', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('sin ítems no hay ítem actual ni avanza', () => {
    const { result } = renderHook(() => useHolidayCarousel<string>([], 1000));
    act(() => result.current.next());
    expect(result.current.currentIndex).toBe(0);
    expect(result.current.currentItem).toBeUndefined();
  });

  it('con un ítem no rota solo', () => {
    const items = ['a'];
    const { result } = renderHook(() => useHolidayCarousel(items, 1000));
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(result.current.currentIndex).toBe(0);
    expect(result.current.currentItem).toBe('a');
  });

  it('con varios ítems rota por timer y vuelve al inicio', () => {
    const items = ['a', 'b', 'c'];
    const { result } = renderHook(() => useHolidayCarousel(items, 1000));
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.currentItem).toBe('b');
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.currentItem).toBe('c');
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.currentItem).toBe('a');
  });

  it('next avanza manualmente', () => {
    const items = ['a', 'b'];
    const { result } = renderHook(() => useHolidayCarousel(items, 1000));
    act(() => result.current.next());
    expect(result.current.currentItem).toBe('b');
  });
});
