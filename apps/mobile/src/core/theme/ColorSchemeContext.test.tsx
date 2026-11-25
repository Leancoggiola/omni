import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { useEffect } from 'react';
import { Text } from 'react-native';

import { ColorSchemeProvider, useColorSchemeControl } from './ColorSchemeContext';

import type { ProfileTheme } from '@omni/shared/users';

let mockSystemScheme: 'light' | 'dark' = 'light';
jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: () => mockSystemScheme,
}));

let mockReduceMotion = true;
jest.mock('react-native-reanimated', () => ({ useReducedMotion: () => mockReduceMotion }));

const mockCaptureScreen = jest.fn<Promise<string>, []>();
const mockReleaseCapture = jest.fn();
jest.mock('react-native-view-shot', () => ({
  captureScreen: () => mockCaptureScreen(),
  releaseCapture: (uri: string) => mockReleaseCapture(uri),
}));

let control: ReturnType<typeof useColorSchemeControl>;

function Probe() {
  const current = useColorSchemeControl();
  useEffect(() => {
    control = current;
  });
  return <Text>{current.colorScheme}</Text>;
}

async function renderWith(profileTheme: ProfileTheme | null) {
  const tree = (theme: ProfileTheme | null) => (
    <ColorSchemeProvider profileTheme={theme}>
      <Probe />
    </ColorSchemeProvider>
  );
  const view = await render(tree(profileTheme));
  return { rerenderWith: async (theme: ProfileTheme | null) => await view.rerender(tree(theme)) };
}

describe('ColorSchemeProvider', () => {
  beforeEach(() => {
    mockSystemScheme = 'light';
    mockReduceMotion = true;
    mockCaptureScreen.mockReset().mockResolvedValue('file:///snapshot.jpg');
    mockReleaseCapture.mockReset();
  });

  it('sin sesión o con tema auto sigue el esquema del sistema', async () => {
    mockSystemScheme = 'dark';
    const { rerenderWith } = await renderWith(null);
    expect(screen.getByText('dark')).toBeTruthy();

    await rerenderWith('auto');
    expect(screen.getByText('dark')).toBeTruthy();
  });

  it('con tema light o dark usa el del perfil', async () => {
    mockSystemScheme = 'light';
    await renderWith('dark');
    expect(screen.getByText('dark')).toBeTruthy();
  });

  it('el override del toggle pisa al perfil y se descarta al quedar sin sesión', async () => {
    const { rerenderWith } = await renderWith('light');
    await act(() => control.toggle());
    expect(screen.getByText('dark')).toBeTruthy();

    await rerenderWith(null);
    expect(screen.getByText('light')).toBeTruthy();
  });

  it('el override descartado al quedar sin sesión no vuelve al iniciar otra', async () => {
    const { rerenderWith } = await renderWith('light');
    await act(() => control.toggle());
    expect(screen.getByText('dark')).toBeTruthy();

    await rerenderWith(null);
    await rerenderWith('light');
    expect(screen.getByText('light')).toBeTruthy();
  });

  it('con fundido aplica el tema nuevo recién cuando la captura de la pantalla vieja la tapa', async () => {
    mockReduceMotion = false;
    jest.useFakeTimers();
    try {
      await renderWith('light');
      await act(() => control.toggle());

      expect(mockCaptureScreen).toHaveBeenCalledTimes(1);
      expect(screen.getByText('light')).toBeTruthy();

      await act(() => fireEvent(screen.getByTestId('theme-snapshot-fade', { includeHiddenElements: true }), 'load'));
      expect(screen.getByText('dark')).toBeTruthy();

      await act(() => jest.runAllTimers());
      expect(screen.queryByTestId('theme-snapshot-fade', { includeHiddenElements: true })).toBeNull();
      expect(mockReleaseCapture).toHaveBeenCalledWith('file:///snapshot.jpg');
    } finally {
      jest.useRealTimers();
    }
  });

  it('si la captura falla cambia el tema sin fundido', async () => {
    mockReduceMotion = false;
    mockCaptureScreen.mockRejectedValue(new Error('sin ventana'));
    await renderWith('light');
    await act(() => control.toggle());

    expect(screen.getByText('dark')).toBeTruthy();
    expect(screen.queryByTestId('theme-snapshot-fade', { includeHiddenElements: true })).toBeNull();
  });

  it('si la captura no carga aplica el tema sin fundido y libera la captura', async () => {
    mockReduceMotion = false;
    await renderWith('light');
    await act(() => control.toggle());

    await act(() => fireEvent(screen.getByTestId('theme-snapshot-fade', { includeHiddenElements: true }), 'error'));

    expect(screen.getByText('dark')).toBeTruthy();
    expect(screen.queryByTestId('theme-snapshot-fade', { includeHiddenElements: true })).toBeNull();
    expect(mockReleaseCapture).toHaveBeenCalledWith('file:///snapshot.jpg');
  });

  it('con movimiento reducido cambia al instante sin capturar la pantalla', async () => {
    await renderWith('light');
    await act(() => control.toggle());

    expect(screen.getByText('dark')).toBeTruthy();
    expect(mockCaptureScreen).not.toHaveBeenCalled();
  });

  it('useColorSchemeControl fuera del provider tira un error', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(render(<Probe />)).rejects.toThrow('ColorSchemeProvider');
    spy.mockRestore();
  });
});
