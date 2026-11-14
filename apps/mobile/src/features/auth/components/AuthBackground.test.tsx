import { act, render } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import { AuthBackground } from './AuthBackground';

const mockWithRepeat = jest.fn((animation: unknown) => animation);
const mockReducedMotion = jest.fn();
const mockCancelAnimation = jest.fn();

jest.mock('react-native-reanimated', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: { View },
    useSharedValue: (value: number) => ({ value }),
    useAnimatedStyle: () => ({}),
    useReducedMotion: () => mockReducedMotion(),
    withRepeat: (animation: unknown) => mockWithRepeat(animation),
    withTiming: (to: number) => to,
    cancelAnimation: (value: unknown) => mockCancelAnimation(value),
    interpolate: () => 0,
    Easing: { inOut: () => undefined, ease: undefined },
  };
});

describe('AuthBackground', () => {
  const remove = jest.fn();
  const addListener = jest.spyOn(AccessibilityInfo, 'addEventListener');

  beforeEach(() => {
    mockWithRepeat.mockClear();
    mockCancelAnimation.mockClear();
    remove.mockClear();
    addListener.mockReset();
    addListener.mockReturnValue({ remove } as unknown as ReturnType<typeof AccessibilityInfo.addEventListener>);
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockReturnValue(new Promise(() => undefined));
  });

  it('anima las tres manchas', async () => {
    mockReducedMotion.mockReturnValue(false);
    await render(<AuthBackground />);
    expect(mockWithRepeat).toHaveBeenCalledTimes(3);
  });

  it('al desmontar cancela las tres animaciones (withRepeat infinito)', async () => {
    mockReducedMotion.mockReturnValue(false);
    const { unmount } = await render(<AuthBackground />);
    mockCancelAnimation.mockClear();
    await unmount();
    expect(mockCancelAnimation).toHaveBeenCalledTimes(3);
  });

  it('con "reducir movimiento" quedan quietas', async () => {
    mockReducedMotion.mockReturnValue(true);
    await render(<AuthBackground />);
    expect(mockWithRepeat).not.toHaveBeenCalled();
  });

  it('si se activa "reducir movimiento" con el fondo montado, cancela las animaciones', async () => {
    mockReducedMotion.mockReturnValue(false);
    const { unmount } = await render(<AuthBackground />);
    expect(addListener).toHaveBeenCalledWith('reduceMotionChanged', expect.any(Function));

    mockCancelAnimation.mockClear();
    const handler = addListener.mock.calls[0][1] as unknown as (enabled: boolean) => void;
    mockWithRepeat.mockClear();
    await act(() => handler(true));
    expect(mockCancelAnimation).toHaveBeenCalled();
    expect(mockWithRepeat).not.toHaveBeenCalled();

    await unmount();
    expect(remove).toHaveBeenCalled();
  });

  it('es decorativo: no recibe toques ni lo lee TalkBack', async () => {
    mockReducedMotion.mockReturnValue(false);
    const { toJSON } = await render(<AuthBackground />);
    const root = toJSON() as { props: Record<string, unknown> };
    expect(root.props.pointerEvents).toBe('none');
    expect(root.props.importantForAccessibility).toBe('no-hide-descendants');
  });
});
