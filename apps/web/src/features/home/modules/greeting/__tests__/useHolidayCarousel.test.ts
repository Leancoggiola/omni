import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useHolidayCarousel } from '../components/HolidaysCard/utils';

import { act, renderHook } from '@testing-library/react';

let reduceMotion = false;

vi.mock('@mantine/hooks', async importOriginal => ({
  ...(await importOriginal<typeof import('@mantine/hooks')>()),
  useReducedMotion: () => reduceMotion,
}));

describe('useHolidayCarousel', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    reduceMotion = false;
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
    expect(result.current.isAutoPlaying).toBe(false);
  });

  it('con varios ítems rota por timer y vuelve al inicio', () => {
    const items = ['a', 'b', 'c'];
    const { result } = renderHook(() => useHolidayCarousel(items, 1000));
    expect(result.current.isAutoPlaying).toBe(true);
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

  it('si la lista se achica el índice vuelve a quedar dentro de rango', () => {
    const { result, rerender } = renderHook(({ items }) => useHolidayCarousel(items, 1000), {
      initialProps: { items: ['a', 'b', 'c'] },
    });
    act(() => result.current.next());
    act(() => result.current.next());
    expect(result.current.currentItem).toBe('c');

    rerender({ items: ['x', 'y'] });
    expect(result.current.currentIndex).toBe(0);
    expect(result.current.currentItem).toBe('x');

    act(() => result.current.next());
    expect(result.current.currentItem).toBe('y');

    rerender({ items: [] });
    expect(result.current.currentIndex).toBe(0);
    expect(result.current.currentItem).toBeUndefined();
  });

  it('en pausa no rota solo, pero next sigue avanzando; al reanudar arranca el ciclo completo', () => {
    const items = ['a', 'b', 'c'];
    const { result, rerender } = renderHook(({ paused }) => useHolidayCarousel(items, 1000, { paused }), {
      initialProps: { paused: true },
    });
    expect(result.current.isAutoPlaying).toBe(false);
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(result.current.currentItem).toBe('a');

    act(() => result.current.next());
    expect(result.current.currentItem).toBe('b');

    rerender({ paused: false });
    act(() => {
      vi.advanceTimersByTime(999);
    });
    expect(result.current.currentItem).toBe('b');
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.currentItem).toBe('c');
  });

  it('con prefers-reduced-motion no rota solo, pero next sigue avanzando', () => {
    reduceMotion = true;
    const items = ['a', 'b'];
    const { result } = renderHook(() => useHolidayCarousel(items, 1000));
    expect(result.current.isAutoPlaying).toBe(false);
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(result.current.currentItem).toBe('a');
    act(() => result.current.next());
    expect(result.current.currentItem).toBe('b');
  });
});
