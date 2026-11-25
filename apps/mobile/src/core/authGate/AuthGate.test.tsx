import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { notifyError } from '@/shared/ui';

import { AuthGate, SESSION_ERROR_MESSAGE, SESSION_ROUTES } from './AuthGate';

import type { ReactNode } from 'react';

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
const mockLaunchDestination = jest.fn<void, [boolean]>();

jest.mock('@/core/auth', () => ({ useAuth: () => mockAuth }));
jest.mock('@/core/biometrics', () => ({ useBiometrics: () => mockBiometrics }));
jest.mock('@/core/launch', () => ({ useLaunchDestination: (ready: boolean) => mockLaunchDestination(ready) }));
jest.mock('@/shared/ui', () => ({ ...jest.requireActual('@/shared/ui'), notifyError: jest.fn() }));
jest.mock('expo-router', () => {
  const { Text: MockText } = jest.requireActual<typeof import('react-native')>('react-native');
  function MockStack({ children }: { children: ReactNode }) {
    return <>{children}</>;
  }
  function MockProtected({ guard, children }: { guard: boolean; children: ReactNode }) {
    return guard ? <>{children}</> : null;
  }
  function MockScreen({ name }: { name: string }) {
    return <MockText>{`route:${name}`}</MockText>;
  }
  MockStack.Protected = MockProtected;
  MockStack.Screen = MockScreen;
  return { Stack: MockStack };
});

const setAuth = (overrides: Partial<typeof mockAuth>) => Object.assign(mockAuth, overrides);

const shownRoutes = () =>
  screen.queryAllByText(/^route:/).map(node => String(node.props.children).slice('route:'.length));

/**
 * Nombres de las rutas del `Stack` raíz según los archivos de `app/`: un grupo con `_layout` es una sola ruta y una
 * carpeta sin él aporta una por archivo.
 */
function appRoutes(dir: string, prefix = ''): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    if (entry.name.startsWith('_')) return [];
    if (!entry.isDirectory()) return [`${prefix}${entry.name.replace(/\.tsx?$/, '')}`];
    const path = join(dir, entry.name);
    if (existsSync(join(path, '_layout.tsx'))) return [`${prefix}${entry.name}`];
    return appRoutes(path, `${prefix}${entry.name}/`);
  });
}

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
  mockLaunchDestination.mockClear();
});

describe('AuthGate', () => {
  it('cada ruta de app/ menos el login pide sesión', () => {
    const routes = appRoutes(join(__dirname, '../../../app'));

    expect(routes).toContain('login');
    expect([...SESSION_ROUTES].sort()).toEqual(routes.filter(route => route !== 'login').sort());
  });

  describe('aviso a la animación de arranque', () => {
    it.each([
      ['con sesión', { isAuthenticated: true }, {}, true],
      ['con la sesión sin verificar', { isSessionUnverified: true }, {}, true],
      ['mientras verifica la sesión', { isLoading: true }, {}, false],
      ['mientras lee la biometría', { isAuthenticated: true }, { ready: false }, false],
      ['sin sesión, porque avisa el login', {}, {}, false],
      ['con la app bloqueada, porque avisa el login', { isAuthenticated: true }, { locked: true }, false],
    ])('%s', async (_, auth, biometrics, ready) => {
      setAuth(auth);
      Object.assign(mockBiometrics, biometrics);

      await render(<AuthGate />);

      expect(mockLaunchDestination).toHaveBeenLastCalledWith(ready);
    });
  });

  it('muestra el spinner mientras verifica la sesión, sin montar rutas', async () => {
    setAuth({ isLoading: true });
    await render(<AuthGate />);

    expect(screen.getByRole('progressbar', { name: 'Cargando' })).toBeTruthy();
    expect(shownRoutes()).toEqual([]);
  });

  it('sin sesión solo está el login', async () => {
    await render(<AuthGate />);

    expect(shownRoutes()).toEqual(['login']);
  });

  it('con sesión están las rutas de la app, con las tabs primero, y no el login', async () => {
    setAuth({ isAuthenticated: true });
    await render(<AuthGate />);

    expect(shownRoutes()).toEqual(SESSION_ROUTES);
    expect(shownRoutes()[0]).toBe('(tabs)');
  });

  describe('bloqueo biométrico', () => {
    it('con sesión y bloqueado solo está el login', async () => {
      setAuth({ isAuthenticated: true });
      mockBiometrics.locked = true;
      await render(<AuthGate />);

      expect(shownRoutes()).toEqual(['login']);
    });

    it('al desbloquear pasan a estar las rutas de la app', async () => {
      setAuth({ isAuthenticated: true });
      mockBiometrics.locked = true;
      const view = await render(<AuthGate />);

      mockBiometrics.locked = false;
      await view.rerender(<AuthGate />);

      expect(shownRoutes()).toEqual(SESSION_ROUTES);
    });

    it('sin sesión el bloqueo no cambia nada: solo el login', async () => {
      mockBiometrics.locked = true;
      await render(<AuthGate />);

      expect(shownRoutes()).toEqual(['login']);
    });

    it('mientras se lee la preferencia muestra el spinner, sin dejar ver la app', async () => {
      setAuth({ isAuthenticated: true });
      mockBiometrics.ready = false;
      await render(<AuthGate />);

      expect(screen.getByRole('progressbar', { name: 'Cargando' })).toBeTruthy();
      expect(shownRoutes()).toEqual([]);
    });
  });

  describe('con token y la sesión sin verificar', () => {
    it('muestra el ErrorState en vez de mandar al login, y "Reintentar" vuelve a pedir la sesión', async () => {
      setAuth({ isSessionUnverified: true });
      await render(<AuthGate />);

      expect(screen.getByText(SESSION_ERROR_MESSAGE)).toBeTruthy();
      expect(shownRoutes()).toEqual([]);

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
  });
});
