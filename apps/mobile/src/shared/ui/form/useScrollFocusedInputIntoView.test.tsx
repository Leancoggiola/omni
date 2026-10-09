import { act, renderHook } from '@testing-library/react-native';
import { Keyboard, TextInput } from 'react-native';

import { useScrollFocusedInputIntoView } from './useScrollFocusedInputIntoView';

type Listener = (event: { endCoordinates: { screenY: number } }) => void;

const listeners: Record<string, Listener> = {};
const scrollTo = jest.fn();

function focusInputAt(y: number, height = 44) {
  jest.spyOn(TextInput.State, 'currentlyFocusedInput').mockReturnValue({
    measureInWindow: (callback: (x: number, y: number, width: number, height: number) => void) =>
      callback(0, y, 300, height),
  } as never);
}

function setup() {
  const hook = renderHook(() => useScrollFocusedInputIntoView());
  (hook.result.current.scrollRef as { current: unknown }).current = { scrollTo };
  return hook;
}

const showKeyboard = async (screenY: number) => {
  await act(async () => listeners.keyboardDidShow({ endCoordinates: { screenY } }));
  // `scrollIntoView` espera un frame.
  await act(async () => jest.advanceTimersByTime(50));
};

beforeEach(() => {
  jest.useFakeTimers();
  scrollTo.mockClear();
  jest.spyOn(Keyboard, 'addListener').mockImplementation(((name: string, listener: Listener) => {
    listeners[name] = listener;
    return { remove: jest.fn() };
  }) as never);
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

describe('useScrollFocusedInputIntoView', () => {
  it('al abrirse el teclado scrollea lo justo para que el campo (y el botón que sigue) queden arriba de él', async () => {
    setup();
    focusInputAt(1000);
    await showKeyboard(900);

    // bottom del campo 1044 + 96 de aire − 900 de teclado = 240
    expect(scrollTo).toHaveBeenCalledWith({ y: 240, animated: true });
  });

  it('suma el scroll actual al desplazamiento', async () => {
    const { result } = setup();
    act(() =>
      result.current.onScroll({ nativeEvent: { contentOffset: { y: 300 } } } as Parameters<
        typeof result.current.onScroll
      >[0])
    );
    focusInputAt(1000);
    await showKeyboard(900);

    expect(scrollTo).toHaveBeenCalledWith({ y: 540, animated: true });
  });

  it('no scrollea si el campo ya queda a la vista', async () => {
    setup();
    focusInputAt(300);
    await showKeyboard(900);

    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('al pasar al campo siguiente con el teclado abierto vuelve a acomodar', async () => {
    const { result } = setup();
    focusInputAt(300);
    await showKeyboard(900);
    focusInputAt(1000);
    act(() => result.current.scrollIntoView());
    await act(async () => jest.advanceTimersByTime(50));

    expect(scrollTo).toHaveBeenCalledWith({ y: 240, animated: true });
  });

  it('si se desmonta antes del frame no mide ni scrollea', async () => {
    const measureInWindow = jest.fn();
    jest.spyOn(TextInput.State, 'currentlyFocusedInput').mockReturnValue({ measureInWindow } as never);
    const { unmount } = setup();
    await act(async () => listeners.keyboardDidShow({ endCoordinates: { screenY: 900 } }));
    unmount();
    await act(async () => jest.advanceTimersByTime(50));

    expect(measureInWindow).not.toHaveBeenCalled();
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('sin teclado visible no hace nada', async () => {
    const { result } = setup();
    focusInputAt(1000);
    act(() => result.current.scrollIntoView());
    await act(async () => jest.advanceTimersByTime(50));

    expect(scrollTo).not.toHaveBeenCalled();
  });
});
