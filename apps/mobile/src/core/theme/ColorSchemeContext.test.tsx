import { act, render, screen } from '@testing-library/react-native';
import { useEffect } from 'react';
import { Text } from 'react-native';

import { ColorSchemeProvider, useColorSchemeControl } from './ColorSchemeContext';

import type { ProfileTheme } from '@omni/shared/users';

let mockSystemScheme: 'light' | 'dark' = 'light';
jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: () => mockSystemScheme,
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

  it('useColorSchemeControl fuera del provider tira un error', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(render(<Probe />)).rejects.toThrow('ColorSchemeProvider');
    spy.mockRestore();
  });
});
