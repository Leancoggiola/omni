import { act, renderHook } from '@testing-library/react-native';

import { finishLaunch, resetLaunch, useLaunchDestination, useLaunchState } from './launchState';

beforeEach(() => {
  resetLaunch();
});

describe('estado del arranque', () => {
  it('arranca sin destino lista y sin terminar', async () => {
    const { result } = await renderHook(() => useLaunchState());

    expect(result.current).toEqual({ destinationReady: false, finished: false });
  });

  it('useLaunchDestination avisa recién cuando la pantalla está lista', async () => {
    const state = await renderHook(() => useLaunchState());
    const destination = await renderHook((ready: boolean) => useLaunchDestination(ready), { initialProps: false });
    expect(state.result.current.destinationReady).toBe(false);

    await destination.rerender(true);

    expect(state.result.current.destinationReady).toBe(true);
  });

  it('terminado queda terminado para quien se monte después', async () => {
    await act(() => finishLaunch());

    const { result } = await renderHook(() => useLaunchState());

    expect(result.current.finished).toBe(true);
  });
});
