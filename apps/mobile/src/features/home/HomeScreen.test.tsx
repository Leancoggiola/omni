import { render, screen } from '@testing-library/react-native';

import { HomeScreen } from './HomeScreen';

const mockUseAuth = jest.fn();

jest.mock('tamagui', () => jest.requireActual('@/test/tamaguiMock'));
jest.mock('@/core/theme', () => jest.requireActual('@/test/themeMock'));
jest.mock('@/core/auth', () => ({ useAuth: () => mockUseAuth() }));
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default
);
jest.mock('./components/HolidaysCard', () => {
  const { Text } = jest.requireActual('react-native');
  return { HolidaysCard: () => <Text>Efemérides de hoy</Text> };
});

afterEach(() => {
  jest.useRealTimers();
});

describe('HomeScreen', () => {
  it('es una sola card con el saludo, el nombre y las efemérides adentro, sin ScreenHeader', () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 9, 9, 9, 0));
    mockUseAuth.mockReturnValue({ user: { name: 'Admin Omni' }, isLoading: false });
    render(<HomeScreen />);

    expect(screen.getByText('Buenos días')).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Inicio. Buenos días, Admin Omni' })).toBeTruthy();
    expect(screen.getByText('Admin Omni')).toBeTruthy();
    expect(screen.getByText('Efemérides de hoy')).toBeTruthy();
    expect(screen.queryByText('Bienvenido a Omni')).toBeNull();
  });

  it.each([
    [9, 'Buenos días'],
    [15, 'Buenas tardes'],
    [21, 'Buenas noches'],
  ])('a las %i h saluda con "%s"', (hour, greeting) => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 9, 9, hour, 0));
    mockUseAuth.mockReturnValue({ user: { name: 'Admin Omni' }, isLoading: false });
    render(<HomeScreen />);

    expect(screen.getByText(greeting)).toBeTruthy();
  });

  it('mientras carga la sesión muestra un placeholder en lugar del nombre', () => {
    mockUseAuth.mockReturnValue({ user: null, isLoading: true });
    render(<HomeScreen />);

    expect(screen.getByLabelText('Cargando tu nombre')).toBeTruthy();
    expect(screen.queryByText('Admin Omni')).toBeNull();
  });
});
