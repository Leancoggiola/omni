import { act, renderHook } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import { useHolidayCarousel } from './useHolidayCarousel';

const mockReducedMotion = jest.fn();

jest.mock('react-native-reanimated', () => ({
  useReducedMotion: () => mockReducedMotion(),
}));

describe('useHolidayCarousel', () => {
  const remove = jest.fn();
  const addListener = jest.spyOn(AccessibilityInfo, 'addEventListener');
  let onReduceMotionChanged: (enabled: boolean) => void = () => undefined;

  beforeEach(() => {
    jest.useFakeTimers();
    mockReducedMotion.mockReturnValue(false);
    remove.mockClear();
    addListener.mockReset();
    addListener.mockImplementation((_event, handler) => {
      onReduceMotionChanged = handler as unknown as (enabled: boolean) => void;
      return { remove } as unknown as ReturnType<typeof AccessibilityInfo.addEventListener>;
    });
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

  it('con "reducir movimiento" no avanza solo, pero next sí', () => {
    mockReducedMotion.mockReturnValue(true);
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

  it('frena si "reducir movimiento" se activa con la pantalla abierta, y desuscribe al desmontar', () => {
    const items = ['a', 'b'];
    const { result, unmount } = renderHook(() => useHolidayCarousel(items, 1000));

    act(() => onReduceMotionChanged(true));
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(result.current.isAutoPlaying).toBe(false);
    expect(result.current.currentItem).toBe('a');

    unmount();
    expect(remove).toHaveBeenCalledTimes(1);
  });
});
