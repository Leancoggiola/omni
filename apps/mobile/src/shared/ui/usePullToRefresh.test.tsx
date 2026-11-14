import { act, renderHook } from '@testing-library/react-native';

import { usePullToRefresh } from './usePullToRefresh';

jest.mock('@/core/theme', () => jest.requireActual('@/test/themeMock'));

function deferred() {
  let resolve!: () => void;
  let reject!: (err: unknown) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('usePullToRefresh', () => {
  it('muestra el indicador mientras dura el refresh y lo saca al terminar', async () => {
    const pending = deferred();
    const refresh = jest.fn(() => pending.promise);
    const { result } = await renderHook(() => usePullToRefresh(refresh));
    expect(result.current.props.refreshing).toBe(false);

    await act(() => result.current.props.onRefresh?.());
    expect(result.current.props.refreshing).toBe(true);
    expect(refresh).toHaveBeenCalledTimes(1);

    await act(async () => pending.resolve());
    expect(result.current.props.refreshing).toBe(false);
  });

  it('ignora un segundo gesto mientras hay un refresh en curso', async () => {
    const pending = deferred();
    const refresh = jest.fn(() => pending.promise);
    const { result } = await renderHook(() => usePullToRefresh(refresh));

    await act(() => result.current.props.onRefresh?.());
    await act(() => result.current.props.onRefresh?.());
    expect(refresh).toHaveBeenCalledTimes(1);

    await act(async () => pending.resolve());
  });

  it('si el refresh falla no deja el indicador colgado', async () => {
    const pending = deferred();
    const { result } = await renderHook(() => usePullToRefresh(() => pending.promise));

    await act(() => result.current.props.onRefresh?.());
    await act(async () => pending.reject(new TypeError('Network request failed')));

    expect(result.current.props.refreshing).toBe(false);
  });
});
