import { act, renderHook } from '@testing-library/react-native';

import { useHolidayCarousel } from './useHolidayCarousel';

const mockReduceMotion = jest.fn();

jest.mock('@/shared/ui', () => ({
  useReduceMotion: () => mockReduceMotion(),
}));

describe('useHolidayCarousel', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockReduceMotion.mockReturnValue(false);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('con varios ítems avanza solo y vuelve al primero', () => {
    const items = ['a', 'b'];
    const { result } = renderHook(() => useHolidayCarousel(items, 1000));

    expect(result.current.isAutoPlaying).toBe(true);
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(result.current.currentItem).toBe('b');
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(result.current.currentItem).toBe('a');
  });

  it('con un solo ítem no avanza', () => {
    const items = ['a'];
    const { result } = renderHook(() => useHolidayCarousel(items, 1000));

    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(result.current.isAutoPlaying).toBe(false);
    expect(result.current.currentItem).toBe('a');
  });

  it('con "reducir movimiento" no avanza solo, pero next sí', () => {
    mockReduceMotion.mockReturnValue(true);
    const items = ['a', 'b'];
    const { result } = renderHook(() => useHolidayCarousel(items, 1000));

    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(result.current.isAutoPlaying).toBe(false);
    expect(result.current.currentItem).toBe('a');

    act(() => result.current.next());
    expect(result.current.currentItem).toBe('b');
  });

  it('frena si "reducir movimiento" se activa con la pantalla abierta', () => {
    const items = ['a', 'b'];
    const { result, rerender } = renderHook(() => useHolidayCarousel(items, 1000));

    mockReduceMotion.mockReturnValue(true);
    rerender({});
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(result.current.isAutoPlaying).toBe(false);
    expect(result.current.currentItem).toBe('a');
  });
});
