import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useToday } from '../hooks';

import { act, renderHook } from '@testing-library/react';

describe('useToday', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('usa el día de APP_TIMEZONE, no el UTC', () => {
    vi.setSystemTime(new Date('2026-10-08T01:00:00Z'));
    const { result } = renderHook(() => useToday());
    expect(result.current).toBe('2026-10-07');
  });

  it('cambia al cruzar la medianoche', () => {
    vi.setSystemTime(new Date('2026-10-08T02:59:30Z'));
    const { result } = renderHook(() => useToday());
    expect(result.current).toBe('2026-10-07');
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(result.current).toBe('2026-10-08');
  });

  it('se actualiza al volver a la pestaña', () => {
    vi.setSystemTime(new Date('2026-10-08T02:00:00Z'));
    const { result } = renderHook(() => useToday());
    vi.setSystemTime(new Date('2026-10-08T04:00:00Z'));
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(result.current).toBe('2026-10-08');
  });
});
