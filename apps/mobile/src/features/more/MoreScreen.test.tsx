import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { confirm, notifyError } from '@/shared/ui';

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
  confirm: jest.fn(),
  notifyError: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(confirm).mockResolvedValue(true);
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

  const pressLogout = () => act(async () => fireEvent.press(screen.getByRole('button', { name: 'Cerrar sesión' })));

  it('pide confirmación antes de cerrar la sesión', async () => {
    render(<MoreScreen />);
    await pressLogout();

    expect(confirm).toHaveBeenCalledWith(expect.objectContaining({ title: '¿Cerrar sesión?' }));
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it('si se cancela la confirmación no cierra la sesión', async () => {
    jest.mocked(confirm).mockResolvedValue(false);
    render(<MoreScreen />);
    await pressLogout();

    expect(mockLogout).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Cerrar sesión', busy: false })).toBeTruthy();
  });

  it('"Cerrar sesión" queda ocupado mientras cierra y no se envía dos veces', async () => {
    let finish!: () => void;
    mockLogout.mockReturnValue(new Promise<void>(resolve => (finish = resolve)));
    render(<MoreScreen />);
    await pressLogout();

    expect(screen.getByRole('button', { name: 'Cerrar sesión', busy: true })).toBeTruthy();
    await pressLogout();
    expect(mockLogout).toHaveBeenCalledTimes(1);
    await act(async () => finish());
  });

  it('si falla el cierre de sesión avisa con notifyError y reactiva el botón', async () => {
    mockLogout.mockRejectedValue(new Error('SecureStore no disponible'));
    render(<MoreScreen />);
    await pressLogout();

    expect(notifyError).toHaveBeenCalledWith('No se pudo cerrar la sesión');
    expect(screen.getByRole('button', { name: 'Cerrar sesión', busy: false })).toBeTruthy();
  });
});
