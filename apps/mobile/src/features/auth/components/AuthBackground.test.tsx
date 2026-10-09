import { render } from '@testing-library/react-native';

import { AuthBackground } from './AuthBackground';

const mockWithRepeat = jest.fn((animation: unknown) => animation);
const mockReducedMotion = jest.fn();

// Doble mínimo de reanimated: lo que se prueba es si arranca la animación, no el motor.
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
    cancelAnimation: jest.fn(),
    interpolate: () => 0,
    Easing: { inOut: () => undefined, ease: undefined },
  };
});

describe('AuthBackground', () => {
  beforeEach(() => mockWithRepeat.mockClear());

  it('anima las tres manchas', () => {
    mockReducedMotion.mockReturnValue(false);
    render(<AuthBackground />);
    expect(mockWithRepeat).toHaveBeenCalledTimes(3);
  });

  it('con "reducir movimiento" quedan quietas', () => {
    mockReducedMotion.mockReturnValue(true);
    render(<AuthBackground />);
    expect(mockWithRepeat).not.toHaveBeenCalled();
  });

  it('es decorativo: no recibe toques ni lo lee TalkBack', () => {
    mockReducedMotion.mockReturnValue(false);
    const { toJSON } = render(<AuthBackground />);
    const root = toJSON() as { props: Record<string, unknown> };
    expect(root.props.pointerEvents).toBe('none');
    expect(root.props.importantForAccessibility).toBe('no-hide-descendants');
  });
});
