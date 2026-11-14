import { act, renderHook } from '@testing-library/react-native';

import { SHEET_EXIT_MS, useSheetQueue, type SheetRequest } from './useSheetQueue';

type Handler = (request: SheetRequest<string>) => void;

function setup() {
  let handler: Handler = () => undefined;
  const unregister = jest.fn();
  const register = (next: Handler) => {
    handler = next;
    return unregister;
  };
  const hook = renderHook(() => useSheetQueue<string, SheetRequest<string>>(register, 'cancel'));
  const enqueue = (request: SheetRequest<string>) => act(() => handler(request));
  return { hook, enqueue };
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe('useSheetQueue', () => {
  it('un segundo cierre en el mismo tick no resuelve la request dos veces', () => {
    const { hook, enqueue } = setup();
    const resolve = jest.fn();
    enqueue({ resolve });

    act(() => {
      hook.result.current.close('ok');
      hook.result.current.close('otro');
    });

    expect(resolve).toHaveBeenCalledTimes(1);
    expect(resolve).toHaveBeenCalledWith('ok');
    expect(hook.result.current.open).toBe(false);
  });

  it('cerrar por overlay o Atrás resuelve con el valor de cancelación, una sola vez', () => {
    const { hook, enqueue } = setup();
    const resolve = jest.fn();
    enqueue({ resolve });

    act(() => {
      hook.result.current.onOpenChange(false);
      hook.result.current.onOpenChange(false);
    });

    expect(resolve).toHaveBeenCalledTimes(1);
    expect(resolve).toHaveBeenCalledWith('cancel');
  });

  it('la próxima request entra recién cuando termina la salida y su cierre resuelve solo a ella', () => {
    const { hook, enqueue } = setup();
    const first = jest.fn();
    const second = jest.fn();
    enqueue({ resolve: first });
    enqueue({ resolve: second });

    act(() => hook.result.current.close('a'));
    expect(hook.result.current.open).toBe(false);
    act(() => jest.advanceTimersByTime(SHEET_EXIT_MS));
    expect(hook.result.current.open).toBe(true);

    act(() => {
      hook.result.current.close('b');
      hook.result.current.close('c');
    });

    expect(first).toHaveBeenCalledTimes(1);
    expect(first).toHaveBeenCalledWith('a');
    expect(second).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledWith('b');
  });

  it('al desmontar resuelve con la cancelación la request abierta y las pendientes', () => {
    const { hook, enqueue } = setup();
    const open = jest.fn();
    const pending = jest.fn();
    enqueue({ resolve: open });
    enqueue({ resolve: pending });

    hook.unmount();

    expect(open).toHaveBeenCalledWith('cancel');
    expect(pending).toHaveBeenCalledWith('cancel');
  });
});
