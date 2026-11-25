import { act, renderHook } from '@testing-library/react-native';

import {
  finishLaunch,
  LAUNCH_DESTINATION_TIMEOUT_MS,
  resetLaunch,
  useLaunchDeadline,
  useLaunchDestination,
  useLaunchState,
} from './launchState';

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

  describe('tope de seguridad', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    const advance = async (ms: number) => await act(async () => await jest.advanceTimersByTimeAsync(ms));

    it('con la sesión resuelta y sin aviso de ninguna pantalla, da la destino por lista al vencer', async () => {
      const state = await renderHook(() => useLaunchState());
      await renderHook(() => useLaunchDeadline(true));

      await advance(LAUNCH_DESTINATION_TIMEOUT_MS - 1);
      expect(state.result.current.destinationReady).toBe(false);

      await advance(1);
      expect(state.result.current.destinationReady).toBe(true);
    });

    it('no corre mientras la sesión no está resuelta, y se corta si vuelve a verificarse', async () => {
      const state = await renderHook(() => useLaunchState());
      const deadline = await renderHook((settled: boolean) => useLaunchDeadline(settled), { initialProps: false });
      await advance(10 * LAUNCH_DESTINATION_TIMEOUT_MS);

      await deadline.rerender(true);
      await advance(LAUNCH_DESTINATION_TIMEOUT_MS - 1);
      await deadline.rerender(false);
      await advance(10 * LAUNCH_DESTINATION_TIMEOUT_MS);

      expect(state.result.current.destinationReady).toBe(false);
    });
  });

  it('terminado queda terminado para quien se monte después', async () => {
    await act(() => finishLaunch());

    const { result } = await renderHook(() => useLaunchState());

    expect(result.current.finished).toBe(true);
  });
});
