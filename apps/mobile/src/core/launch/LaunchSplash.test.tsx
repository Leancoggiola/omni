import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import appJson from '../../../app.json';

import { LAUNCH_EXIT_MS, LAUNCH_FADE_MS, LAUNCH_SPIN_MS, LaunchSplash, SPLASH_BACKGROUND } from './LaunchSplash';
import { markLaunchDestinationReady, resetLaunch } from './launchState';

const mockHideSplash = jest.fn<Promise<void>, []>();
jest.mock('expo-splash-screen', () => ({ hideAsync: () => mockHideSplash() }));

let mockReduceMotion = false;
jest.mock('react-native-reanimated', () => ({ useReducedMotion: () => mockReduceMotion }));

let mockSystemScheme: 'light' | 'dark' = 'light';
jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: () => mockSystemScheme,
}));

const FRAME_MS = 20;

const advance = async (ms: number) => await act(async () => await jest.advanceTimersByTimeAsync(ms));
const layer = () => screen.queryByTestId('launch-splash');
const logo = () => screen.getByTestId('launch-splash-logo');
const ready = async () => await act(() => markLaunchDestinationReady());
const loadLogo = async () => {
  await fireEvent(logo(), 'load');
  await advance(2 * FRAME_MS);
};

beforeEach(() => {
  jest.useFakeTimers();
  resetLaunch();
  mockReduceMotion = false;
  mockSystemScheme = 'light';
  mockHideSplash.mockReset().mockResolvedValue(undefined);
});

afterEach(() => {
  jest.useRealTimers();
});

describe('LaunchSplash', () => {
  const [, nativeSplash] = appJson.expo.plugins.find(
    plugin => Array.isArray(plugin) && plugin[0] === 'expo-splash-screen'
  ) as [string, { imageWidth: number; backgroundColor: string; dark: { backgroundColor: string } }];

  it.each([
    ['light', nativeSplash.backgroundColor],
    ['dark', nativeSplash.dark.backgroundColor],
  ] as const)('en %s su primer cuadro es el de la splash nativa', async (scheme, background) => {
    mockSystemScheme = scheme;
    await render(<LaunchSplash />);

    expect(SPLASH_BACKGROUND[scheme]).toBe(background);
    expect(layer()).toHaveStyle({ backgroundColor: background, opacity: 1 });
    expect(logo()).toHaveStyle({ width: nativeSplash.imageWidth, height: nativeSplash.imageWidth });
  });

  it('se anuncia como "Cargando"', async () => {
    await render(<LaunchSplash />);

    expect(screen.getByRole('progressbar', { name: 'Cargando' })).toBeTruthy();
  });

  it('conserva el fondo con el que arrancó aunque cambie el tema del sistema', async () => {
    const view = await render(<LaunchSplash />);
    mockSystemScheme = 'dark';
    await view.rerender(<LaunchSplash />);

    expect(layer()).toHaveStyle({ backgroundColor: SPLASH_BACKGROUND.light });
  });

  it('oculta la splash nativa recién cuando el logo cargó y se pintó', async () => {
    await render(<LaunchSplash />);
    await advance(LAUNCH_SPIN_MS);
    expect(mockHideSplash).not.toHaveBeenCalled();

    await loadLogo();

    expect(mockHideSplash).toHaveBeenCalledTimes(1);
  });

  it('si el logo no carga oculta igual la splash nativa', async () => {
    await render(<LaunchSplash />);
    await fireEvent(logo(), 'error');
    await advance(2 * FRAME_MS);

    expect(mockHideSplash).toHaveBeenCalledTimes(1);
  });

  it('con la destino lista de entrada gira el mínimo antes de cerrar', async () => {
    await render(<LaunchSplash />);
    await ready();
    await loadLogo();

    await advance(LAUNCH_SPIN_MS - 100);
    expect(layer()).toHaveStyle({ opacity: 1 });

    await advance(100 + LAUNCH_EXIT_MS + 5 * FRAME_MS);
    expect(layer()).toBeNull();
  });

  it('mientras la destino no está lista sigue en pantalla, y cierra cuando lo está', async () => {
    await render(<LaunchSplash />);
    await loadLogo();
    await advance(60_000);
    expect(layer()).toHaveStyle({ opacity: 1 });

    await ready();
    await advance(LAUNCH_EXIT_MS + 5 * FRAME_MS);

    expect(layer()).toBeNull();
  });

  it('no cierra antes de ocultar la splash nativa', async () => {
    await render(<LaunchSplash />);
    await ready();
    await advance(LAUNCH_SPIN_MS + LAUNCH_EXIT_MS + 5 * FRAME_MS);

    expect(layer()).toBeTruthy();
  });

  it('una vez que terminó no vuelve a aparecer al montar de nuevo', async () => {
    const view = await render(<LaunchSplash />);
    await ready();
    await loadLogo();
    await advance(LAUNCH_SPIN_MS + 5 * FRAME_MS);
    await advance(LAUNCH_EXIT_MS + 5 * FRAME_MS);
    await view.unmount();

    await render(<LaunchSplash />);

    expect(layer()).toBeNull();
  });

  describe('con reducir movimiento', () => {
    beforeEach(() => {
      mockReduceMotion = true;
    });

    it('deja el logo quieto', async () => {
      await render(<LaunchSplash />);
      await loadLogo();
      await advance(LAUNCH_SPIN_MS);

      expect(StyleSheet.flatten(logo().props.style).transform).toBeUndefined();
      expect(layer()).toHaveStyle({ opacity: 1 });
    });

    it('cierra con un fundido corto apenas la destino está lista, sin duración mínima', async () => {
      await render(<LaunchSplash />);
      await ready();
      await loadLogo();
      await advance(LAUNCH_FADE_MS + 5 * FRAME_MS);

      expect(layer()).toBeNull();
    });
  });
});
