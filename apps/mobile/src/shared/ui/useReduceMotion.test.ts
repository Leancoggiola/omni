import { act, renderHook, waitFor } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import { useReduceMotion } from './useReduceMotion';

const mockReducedMotion = jest.fn();

jest.mock('react-native-reanimated', () => ({
  useReducedMotion: () => mockReducedMotion(),
}));

describe('useReduceMotion', () => {
  const remove = jest.fn();
  const addListener = jest.spyOn(AccessibilityInfo, 'addEventListener');
  const isEnabled = jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled');
  let onChange: (enabled: boolean) => void = () => undefined;

  beforeEach(() => {
    remove.mockClear();
    addListener.mockReset();
    addListener.mockImplementation((_event, handler) => {
      onChange = handler as unknown as (enabled: boolean) => void;
      return { remove } as unknown as ReturnType<typeof AccessibilityInfo.addEventListener>;
    });
    isEnabled.mockReset();
  });

  it('arranca con el valor de Reanimated', () => {
    mockReducedMotion.mockReturnValue(true);
    isEnabled.mockReturnValue(new Promise(() => undefined));

    const { result } = renderHook(() => useReduceMotion());

    expect(result.current).toBe(true);
  });

  it('al montar lo corrige con el valor actual del sistema (cambiado con la pantalla desmontada)', async () => {
    mockReducedMotion.mockReturnValue(false);
    isEnabled.mockResolvedValue(true);

    const { result } = renderHook(() => useReduceMotion());

    await waitFor(() => expect(result.current).toBe(true));
  });

  it('un cambio con la pantalla abierta gana sobre la consulta inicial, y desuscribe al desmontar', async () => {
    mockReducedMotion.mockReturnValue(false);
    let resolveInitial!: (enabled: boolean) => void;
    isEnabled.mockReturnValue(new Promise<boolean>(resolve => (resolveInitial = resolve)));
    const { result, unmount } = renderHook(() => useReduceMotion());

    act(() => onChange(true));
    await act(async () => resolveInitial(false));

    expect(result.current).toBe(true);
    unmount();
    expect(remove).toHaveBeenCalledTimes(1);
  });
});
