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
const mockBiometrics = { ready: true, locked: false };
let mockSegments: string[] = [];

jest.mock('@/core/auth', () => ({ useAuth: () => mockAuth }));
jest.mock('@/core/biometrics', () => ({ useBiometrics: () => mockBiometrics }));
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
  Object.assign(mockBiometrics, { ready: true, locked: false });
  mockSegments = [];
});

describe('AuthGate', () => {
  it('muestra el spinner mientras verifica la sesión', async () => {
    setAuth({ isLoading: true });
    await render(<AuthGate />);

    expect(screen.getByRole('progressbar', { name: 'Cargando' })).toBeTruthy();
    expect(screen.queryByText('stack')).toBeNull();
  });

  it('sin sesión manda al login', async () => {
    await render(<AuthGate />);
    expect(screen.getByText('redirect:/login')).toBeTruthy();
  });

  it('sin sesión y ya en el login muestra el stack', async () => {
    mockSegments = ['login'];
    await render(<AuthGate />);
    expect(screen.getByText('stack')).toBeTruthy();
  });

  it('con sesión en el login manda a las tabs', async () => {
    setAuth({ isAuthenticated: true });
    mockSegments = ['login'];
    await render(<AuthGate />);
    expect(screen.getByText('redirect:/(tabs)')).toBeTruthy();
  });

  it('con sesión muestra el stack', async () => {
    setAuth({ isAuthenticated: true });
    await render(<AuthGate />);
    expect(screen.getByText('stack')).toBeTruthy();
  });

  describe('bloqueo biométrico', () => {
    it('con sesión y bloqueado, cualquier ruta redirige al login', async () => {
      setAuth({ isAuthenticated: true });
      mockBiometrics.locked = true;
      await render(<AuthGate />);

      expect(screen.getByText('redirect:/login')).toBeTruthy();
      expect(screen.queryByText('stack')).toBeNull();
    });

    it('con sesión y bloqueado, en el login se queda ahí (no redirige a las tabs)', async () => {
      setAuth({ isAuthenticated: true });
      mockBiometrics.locked = true;
      mockSegments = ['login'];
      await render(<AuthGate />);

      expect(screen.getByText('stack')).toBeTruthy();
      expect(screen.queryByText(/redirect:/)).toBeNull();
    });

    it('al desbloquear, el login redirige a las tabs', async () => {
      setAuth({ isAuthenticated: true });
      mockSegments = ['login'];
      await render(<AuthGate />);

      expect(screen.getByText('redirect:/(tabs)')).toBeTruthy();
    });

    it('sin sesión el bloqueo no cambia nada: va al login', async () => {
      mockBiometrics.locked = true;
      await render(<AuthGate />);

      expect(screen.getByText('redirect:/login')).toBeTruthy();
    });

    it('mientras se lee la preferencia muestra el spinner, sin dejar ver la app', async () => {
      setAuth({ isAuthenticated: true });
      mockBiometrics.ready = false;
      await render(<AuthGate />);

      expect(screen.getByRole('progressbar', { name: 'Cargando' })).toBeTruthy();
      expect(screen.queryByText('stack')).toBeNull();
    });
  });

  describe('con token y la sesión sin verificar', () => {
    it('muestra el ErrorState en vez de mandar al login, y "Reintentar" vuelve a pedir la sesión', async () => {
      setAuth({ isSessionUnverified: true });
      await render(<AuthGate />);

      expect(screen.getByText(SESSION_ERROR_MESSAGE)).toBeTruthy();
      expect(screen.queryByText('redirect:/login')).toBeNull();

      await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));
      expect(mockAuth.retrySession).toHaveBeenCalledTimes(1);
    });

    it('sigue en el ErrorState durante un reintento (no vuelve al spinner) y marca "Reintentar" cargando', async () => {
      setAuth({ isSessionUnverified: true, isRetryingSession: true, isLoading: true });
      await render(<AuthGate />);

      expect(screen.getByText(SESSION_ERROR_MESSAGE)).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Reintentar', busy: true })).toBeTruthy();
    });

    it('"Cerrar sesión" es la salida si la API sigue fallando', async () => {
      setAuth({ isSessionUnverified: true });
      await render(<AuthGate />);

      await act(async () => await fireEvent.press(screen.getByRole('button', { name: 'Cerrar sesión' })));

      expect(mockAuth.logout).toHaveBeenCalledTimes(1);
    });

    it('"Cerrar sesión" queda cargando mientras dura el logout', async () => {
      let finish!: () => void;
      setAuth({ isSessionUnverified: true, logout: jest.fn(() => new Promise<void>(resolve => (finish = resolve))) });
      await render(<AuthGate />);

      await fireEvent.press(screen.getByRole('button', { name: 'Cerrar sesión' }));
      expect(screen.getByRole('button', { name: 'Cerrar sesión', busy: true })).toBeTruthy();

      await act(async () => finish());
      expect(screen.getByRole('button', { name: 'Cerrar sesión', busy: false })).toBeTruthy();
    });

    it('si cerrar sesión falla avisa con notifyError', async () => {
      setAuth({ isSessionUnverified: true, logout: jest.fn().mockRejectedValue(new Error('SecureStore')) });
      await render(<AuthGate />);

      await act(async () => await fireEvent.press(screen.getByRole('button', { name: 'Cerrar sesión' })));

      expect(notifyError).toHaveBeenCalledWith('No se pudo cerrar la sesión');
    });

    it('también en la ruta del login', async () => {
      setAuth({ isSessionUnverified: true });
      mockSegments = ['login'];
      await render(<AuthGate />);
      expect(screen.getByText(SESSION_ERROR_MESSAGE)).toBeTruthy();
    });
  });
});
