import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { notifyError } from '@/shared/ui';

import { MoreScreen } from './MoreScreen';

const mockLogout = jest.fn();

jest.mock('tamagui', () => jest.requireActual('@/test/tamaguiMock'));
jest.mock('@/core/theme', () => ({
  ...jest.requireActual('@/test/themeMock'),
  useColorSchemeControl: () => ({ colorScheme: 'light', toggle: jest.fn() }),
}));
jest.mock('@/core/auth', () => ({
  useAuth: () => ({
    user: { name: 'Admin Omni', email: 'admin@omni.dev', username: 'admin', role: 'ADMIN' },
    logout: mockLogout,
  }),
}));
jest.mock('expo-router', () => ({ useRouter: () => ({ navigate: jest.fn() }) }));
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default
);
jest.mock('@/shared/ui', () => ({
  ...jest.requireActual('@/shared/ui'),
  notifyError: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe('MoreScreen', () => {
  it('los módulos que mobile todavía no tiene salen deshabilitados con el Badge "Próximamente"', () => {
    render(<MoreScreen />);

    expect(screen.getAllByText('Próximamente').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Gimnasio, próximamente', disabled: true })).toBeTruthy();
  });

  it('muestra la tarjeta de usuario que lleva a Perfil', () => {
    render(<MoreScreen />);
    expect(screen.getByRole('button', { name: 'Admin Omni. Ver perfil' })).toBeTruthy();
  });

  it('"Cerrar sesión" queda ocupado mientras cierra y no se envía dos veces', async () => {
    let finish!: () => void;
    mockLogout.mockReturnValue(new Promise<void>(resolve => (finish = resolve)));
    render(<MoreScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Cerrar sesión' }));

    expect(screen.getByRole('button', { name: 'Cerrar sesión', busy: true })).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Cerrar sesión' }));
    expect(mockLogout).toHaveBeenCalledTimes(1);
    await act(async () => finish());
  });

  it('si falla el cierre de sesión avisa con notifyError y reactiva el botón', async () => {
    mockLogout.mockRejectedValue(new Error('Sin conexión'));
    render(<MoreScreen />);
    await act(async () => fireEvent.press(screen.getByRole('button', { name: 'Cerrar sesión' })));

    expect(notifyError).toHaveBeenCalledWith('Sin conexión');
    expect(screen.getByRole('button', { name: 'Cerrar sesión', busy: false })).toBeTruthy();
  });
});
