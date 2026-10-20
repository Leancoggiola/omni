import { act, render, screen } from '@testing-library/react-native';
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
  control = useColorSchemeControl();
  return <Text>{control.colorScheme}</Text>;
}

function renderWith(profileTheme: ProfileTheme | null) {
  const tree = (theme: ProfileTheme | null) => (
    <ColorSchemeProvider profileTheme={theme}>
      <Probe />
    </ColorSchemeProvider>
  );
  const view = render(tree(profileTheme));
  return { rerenderWith: (theme: ProfileTheme | null) => view.rerender(tree(theme)) };
}

describe('ColorSchemeProvider', () => {
  beforeEach(() => {
    mockSystemScheme = 'light';
  });

  it('sin sesión o con tema auto sigue el esquema del sistema', () => {
    mockSystemScheme = 'dark';
    const { rerenderWith } = renderWith(null);
    expect(screen.getByText('dark')).toBeTruthy();

    rerenderWith('auto');
    expect(screen.getByText('dark')).toBeTruthy();
  });

  it('con tema light o dark usa el del perfil', () => {
    mockSystemScheme = 'light';
    renderWith('dark');
    expect(screen.getByText('dark')).toBeTruthy();
  });

  it('el override del toggle pisa al perfil y se descarta al quedar sin sesión', () => {
    const { rerenderWith } = renderWith('light');
    act(() => control.toggle());
    expect(screen.getByText('dark')).toBeTruthy();

    rerenderWith(null);
    expect(screen.getByText('light')).toBeTruthy();
  });

  it('useColorSchemeControl fuera del provider tira un error', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow('ColorSchemeProvider');
    spy.mockRestore();
  });
});
