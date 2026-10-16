import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { notifyError } from '@/shared/ui';

import { AuthGate, SESSION_ERROR_MESSAGE } from './AuthGate';

jest.mock('tamagui', () => jest.requireActual('@/test/tamaguiMock'));
jest.mock('@/core/theme', () => jest.requireActual('@/test/themeMock'));

const mockAuth = {
  isAuthenticated: false,
  isLoading: false,
  isSessionUnverified: false,
  isRetryingSession: false,
  retrySession: jest.fn(),
  logout: jest.fn(),
};
let mockSegments: string[] = [];

jest.mock('@/core/auth', () => ({ useAuth: () => mockAuth }));
jest.mock('@/shared/ui', () => ({ ...jest.requireActual('@/shared/ui'), notifyError: jest.fn() }));
jest.mock('expo-router', () => {
  const { Text: MockText } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    Redirect: ({ href }: { href: string }) => <MockText>{`redirect:${href}`}</MockText>,
    Stack: () => <MockText>stack</MockText>,
    useSegments: () => mockSegments,
  };
});

const setAuth = (overrides: Partial<typeof mockAuth>) => Object.assign(mockAuth, overrides);

beforeEach(() => {
  setAuth({
    isAuthenticated: false,
    isLoading: false,
    isSessionUnverified: false,
    isRetryingSession: false,
    retrySession: jest.fn(),
    logout: jest.fn().mockResolvedValue(undefined),
  });
  mockSegments = [];
});

describe('AuthGate', () => {
  it('muestra el spinner mientras verifica la sesión', () => {
    setAuth({ isLoading: true });
    render(<AuthGate />);

    expect(screen.getByRole('progressbar', { name: 'Cargando' })).toBeTruthy();
    expect(screen.queryByText('stack')).toBeNull();
  });

  it('sin sesión manda al login', () => {
    render(<AuthGate />);
    expect(screen.getByText('redirect:/login')).toBeTruthy();
  });

  it('sin sesión y ya en el login muestra el stack', () => {
    mockSegments = ['login'];
    render(<AuthGate />);
    expect(screen.getByText('stack')).toBeTruthy();
  });

  it('con sesión en el login manda a las tabs', () => {
    setAuth({ isAuthenticated: true });
    mockSegments = ['login'];
    render(<AuthGate />);
    expect(screen.getByText('redirect:/(tabs)')).toBeTruthy();
  });

  it('con sesión muestra el stack', () => {
    setAuth({ isAuthenticated: true });
    render(<AuthGate />);
    expect(screen.getByText('stack')).toBeTruthy();
  });

  describe('con token y la sesión sin verificar', () => {
    it('muestra el ErrorState en vez de mandar al login, y "Reintentar" vuelve a pedir la sesión', () => {
      setAuth({ isSessionUnverified: true });
      render(<AuthGate />);

      expect(screen.getByText(SESSION_ERROR_MESSAGE)).toBeTruthy();
      expect(screen.queryByText('redirect:/login')).toBeNull();

      fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));
      expect(mockAuth.retrySession).toHaveBeenCalledTimes(1);
    });

    it('sigue en el ErrorState durante un reintento (no vuelve al spinner) y marca "Reintentar" cargando', () => {
      setAuth({ isSessionUnverified: true, isRetryingSession: true, isLoading: true });
      render(<AuthGate />);

      expect(screen.getByText(SESSION_ERROR_MESSAGE)).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Reintentar', busy: true })).toBeTruthy();
    });

    it('"Cerrar sesión" es la salida si la API sigue fallando', async () => {
      setAuth({ isSessionUnverified: true });
      render(<AuthGate />);

      await act(async () => fireEvent.press(screen.getByRole('button', { name: 'Cerrar sesión' })));

      expect(mockAuth.logout).toHaveBeenCalledTimes(1);
    });

    it('"Cerrar sesión" queda cargando mientras dura el logout', async () => {
      let finish!: () => void;
      setAuth({ isSessionUnverified: true, logout: jest.fn(() => new Promise<void>(resolve => (finish = resolve))) });
      render(<AuthGate />);

      fireEvent.press(screen.getByRole('button', { name: 'Cerrar sesión' }));
      expect(screen.getByRole('button', { name: 'Cerrar sesión', busy: true })).toBeTruthy();

      await act(async () => finish());
      expect(screen.getByRole('button', { name: 'Cerrar sesión', busy: false })).toBeTruthy();
    });

    it('si cerrar sesión falla avisa con notifyError', async () => {
      setAuth({ isSessionUnverified: true, logout: jest.fn().mockRejectedValue(new Error('SecureStore')) });
      render(<AuthGate />);

      await act(async () => fireEvent.press(screen.getByRole('button', { name: 'Cerrar sesión' })));

      expect(notifyError).toHaveBeenCalledWith('No se pudo cerrar la sesión');
    });

    it('también en la ruta del login', () => {
      setAuth({ isSessionUnverified: true });
      mockSegments = ['login'];
      render(<AuthGate />);
      expect(screen.getByText(SESSION_ERROR_MESSAGE)).toBeTruthy();
    });
  });
});
