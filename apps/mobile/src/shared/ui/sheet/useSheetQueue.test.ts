import { act, renderHook } from '@testing-library/react-native';

import { SHEET_EXIT_MS, useSheetQueue, type SheetRequest } from './useSheetQueue';

type Handler = (request: SheetRequest<string>) => void;

async function setup() {
  let handler: Handler = () => undefined;
  const unregister = jest.fn();
  const register = (next: Handler) => {
    handler = next;
    return unregister;
  };
  const hook = await renderHook(() => useSheetQueue<string, SheetRequest<string>>(register, 'cancel'));
  const enqueue = async (request: SheetRequest<string>) => await act(() => handler(request));
  return { hook, enqueue };
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe('useSheetQueue', () => {
  it('un segundo cierre en el mismo tick no resuelve la request dos veces', async () => {
    const { hook, enqueue } = await setup();
    const resolve = jest.fn();
    await enqueue({ resolve });

    await act(() => {
      hook.result.current.close('ok');
      hook.result.current.close('otro');
    });

    expect(resolve).toHaveBeenCalledTimes(1);
    expect(resolve).toHaveBeenCalledWith('ok');
    expect(hook.result.current.open).toBe(false);
  });

  it('cerrar por overlay o Atrás resuelve con el valor de cancelación, una sola vez', async () => {
    const { hook, enqueue } = await setup();
    const resolve = jest.fn();
    await enqueue({ resolve });

    await act(() => {
      hook.result.current.onOpenChange(false);
      hook.result.current.onOpenChange(false);
    });

    expect(resolve).toHaveBeenCalledTimes(1);
    expect(resolve).toHaveBeenCalledWith('cancel');
  });

  it('la próxima request entra recién cuando termina la salida y su cierre resuelve solo a ella', async () => {
    const { hook, enqueue } = await setup();
    const first = jest.fn();
    const second = jest.fn();
    await enqueue({ resolve: first });
    await enqueue({ resolve: second });

    await act(() => hook.result.current.close('a'));
    expect(hook.result.current.open).toBe(false);
    await act(() => jest.advanceTimersByTime(SHEET_EXIT_MS));
    expect(hook.result.current.open).toBe(true);

    await act(() => {
      hook.result.current.close('b');
      hook.result.current.close('c');
    });

    expect(first).toHaveBeenCalledTimes(1);
    expect(first).toHaveBeenCalledWith('a');
    expect(second).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledWith('b');
  });

  it('al desmontar resuelve con la cancelación la request abierta y las pendientes', async () => {
    const { hook, enqueue } = await setup();
    const open = jest.fn();
    const pending = jest.fn();
    await enqueue({ resolve: open });
    await enqueue({ resolve: pending });

    await hook.unmount();

    expect(open).toHaveBeenCalledWith('cancel');
    expect(pending).toHaveBeenCalledWith('cancel');
  });
});
