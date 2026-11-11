import { act, renderHook } from '@testing-library/react-native';
import { Dimensions, Keyboard } from 'react-native';

import { useKeyboardInset } from './useKeyboardInset';

type Listener = (event: { endCoordinates: { screenY: number } }) => void;

describe('useKeyboardInset', () => {
  const listeners: Record<string, Listener> = {};
  const remove = jest.fn();

  beforeEach(() => {
    remove.mockClear();
    jest.spyOn(Dimensions, 'get').mockReturnValue({ width: 400, height: 900, scale: 1, fontScale: 1 });
    jest.spyOn(Keyboard, 'addListener').mockImplementation(((name: string, listener: Listener) => {
      listeners[name] = listener;
      return { remove };
    }) as unknown as typeof Keyboard.addListener);
  });

  it('con el teclado cerrado es 0', () => {
    const { result } = renderHook(() => useKeyboardInset());
    expect(result.current).toBe(0);
  });

  it('al abrirse es lo que el teclado le quita a la ventana y al cerrarse vuelve a 0', () => {
    const { result } = renderHook(() => useKeyboardInset());

    act(() => listeners.keyboardDidShow({ endCoordinates: { screenY: 600 } }));
    expect(result.current).toBe(300);

    act(() => listeners.keyboardDidHide({ endCoordinates: { screenY: 900 } }));
    expect(result.current).toBe(0);
  });

  it('al desmontar quita los dos listeners', () => {
    const { unmount } = renderHook(() => useKeyboardInset());
    unmount();
    expect(remove).toHaveBeenCalledTimes(2);
  });
});
