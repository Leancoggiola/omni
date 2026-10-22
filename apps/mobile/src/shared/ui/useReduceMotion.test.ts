import { act, renderHook } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import { useReduceMotion } from './useReduceMotion';

const mockReducedMotion = jest.fn();

jest.mock('react-native-reanimated', () => ({
  useReducedMotion: () => mockReducedMotion(),
}));

describe('useReduceMotion', () => {
  const remove = jest.fn();
  const addListener = jest.spyOn(AccessibilityInfo, 'addEventListener');
  let onChange: (enabled: boolean) => void = () => undefined;

  beforeEach(() => {
    remove.mockClear();
    addListener.mockReset();
    addListener.mockImplementation((_event, handler) => {
      onChange = handler as unknown as (enabled: boolean) => void;
      return { remove } as unknown as ReturnType<typeof AccessibilityInfo.addEventListener>;
    });
  });

  it('arranca con el valor del sistema', () => {
    mockReducedMotion.mockReturnValue(true);

    const { result } = renderHook(() => useReduceMotion());

    expect(result.current).toBe(true);
  });

  it('se actualiza si cambia con la pantalla abierta y desuscribe al desmontar', () => {
    mockReducedMotion.mockReturnValue(false);
    const { result, unmount } = renderHook(() => useReduceMotion());

    act(() => onChange(true));
    expect(result.current).toBe(true);
    expect(addListener).toHaveBeenCalledWith('reduceMotionChanged', expect.any(Function));

    unmount();
    expect(remove).toHaveBeenCalledTimes(1);
  });
});
