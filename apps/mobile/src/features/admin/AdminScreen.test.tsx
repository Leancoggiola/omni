import { ApiError } from '@omni/shared/api';
import { act, fireEvent, render, screen, userEvent } from '@testing-library/react-native';

import { confirm, notifyError, notifySuccess, SHEET_EXIT_MS } from '@/shared/ui';
import { getByHostType } from '@/test/hostQueries';

import { AdminScreen } from './AdminScreen';

import type { AdminUser } from '@omni/shared/users';

const mockUsers = jest.fn();
const mockMutations = { createUser: jest.fn(), deleteUser: jest.fn() };
let mockRole = 'ADMIN';

jest.mock('tamagui', () => jest.requireActual('@/test/tamaguiMock'));
jest.mock('@/core/theme', () => jest.requireActual('@/test/themeMock'));
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default
);
jest.mock('@/core/auth', () => ({ useAuth: () => ({ user: { role: mockRole } }) }));
jest.mock('expo-router', () => ({
  useRouter: () => ({ canGoBack: () => true, back: jest.fn(), replace: jest.fn() }),
  Redirect: ({ href }: { href: string }) => {
    const { Text } = jest.requireActual('react-native');
    return <Text>{`redirect:${href}`}</Text>;
  },
}));
jest.mock('./hooks/useAdminUsers', () => ({ useAdminUsers: () => mockUsers() }));
jest.mock('./hooks/useAdminUserMutations', () => ({ useAdminUserMutations: () => mockMutations }));
jest.mock('@/shared/ui', () => ({
  ...jest.requireActual('@/shared/ui'),
  confirm: jest.fn(),
  notifySuccess: jest.fn(),
  notifyError: jest.fn(),
}));

const user = (over: Partial<AdminUser>): AdminUser => ({
  id: 'u1',
  username: 'usuario01',
  name: 'Ana Pérez',
  email: 'ana@omni.dev',
  avatarUrl: null,
  role: 'USER',
  createdAt: '2026-03-07T10:00:00.000Z',
  ...over,
});

const ADMIN = user({ id: 'a1', username: 'admin', name: 'Admin Omni', email: null, role: 'ADMIN' });
const ANA = user({});

function setUsers(users: AdminUser[], extra: Record<string, unknown> = {}) {
  mockUsers.mockReturnValue({ users, isLoading: false, error: undefined, mutate: jest.fn(), ...extra });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockRole = 'ADMIN';
  setUsers([ADMIN, ANA]);
  jest.mocked(confirm).mockResolvedValue(true);
  mockMutations.deleteUser.mockResolvedValue(undefined);
  mockMutations.createUser.mockResolvedValue({});
});

describe('AdminScreen', () => {
  it('un USER es redirigido a Inicio', async () => {
    mockRole = 'USER';
    await render(<AdminScreen />);

    expect(screen.getByText('redirect:/')).toBeTruthy();
    expect(screen.queryByText('Administración')).toBeNull();
  });

  it('lista los usuarios con rol, alta y contador', async () => {
    await render(<AdminScreen />);

    expect(screen.getByText('2 usuarios')).toBeTruthy();
    expect(screen.getByText('@usuario01')).toBeTruthy();
    expect(screen.getByText('@admin')).toBeTruthy();
    expect(screen.getByText('Usuarios registrados')).toBeTruthy();
    expect(screen.getByText('Administrador')).toBeTruthy();
    expect(screen.getByText('Usuario')).toBeTruthy();
    expect(screen.getAllByText(' · Alta 07/03/2026')).toHaveLength(2);
  });

  it('el tacho solo aparece para USER', async () => {
    await render(<AdminScreen />);

    expect(screen.getByLabelText('Eliminar usuario01')).toBeTruthy();
    expect(screen.queryByLabelText('Eliminar admin')).toBeNull();
  });

  it('con un solo usuario el contador va en singular', async () => {
    setUsers([ADMIN]);
    await render(<AdminScreen />);
    expect(screen.getByText('1 usuario')).toBeTruthy();
  });

  it('sin usuarios muestra el estado vacío', async () => {
    setUsers([]);
    await render(<AdminScreen />);
    expect(screen.getByText('Todavía no hay usuarios')).toBeTruthy();
  });

  it('con error muestra ErrorState y reintenta', async () => {
    const mutate = jest.fn();
    setUsers([], { error: new Error('x'), mutate });
    await render(<AdminScreen />);

    expect(screen.getByText('No se pudieron cargar los usuarios')).toBeTruthy();
    expect(screen.queryByText('Todavía no hay usuarios')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: /Reintentar/ }));
    expect(mutate).toHaveBeenCalled();
  });

  it('cargando muestra el estado de carga', async () => {
    setUsers([], { isLoading: true });
    await render(<AdminScreen />);
    expect(screen.getAllByLabelText('Cargando').length).toBeGreaterThan(0);
  });

  it('tirar para actualizar revalida', async () => {
    const mutate = jest.fn().mockResolvedValue(undefined);
    setUsers([ADMIN], { mutate });
    await render(<AdminScreen />);

    await userEvent.setup().pullToRefresh(getByHostType('RCTScrollView'));
    expect(mutate).toHaveBeenCalled();
  });

  it('eliminar confirma con el texto de web y avisa', async () => {
    await render(<AdminScreen />);
    await act(async () => await fireEvent.press(screen.getByLabelText('Eliminar usuario01')));

    expect(confirm).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Eliminar usuario',
        confirmLabel: 'Eliminar usuario',
        description: expect.stringContaining('¿Seguro que querés eliminar a "Ana Pérez" (@usuario01)?'),
      })
    );
    expect(mockMutations.deleteUser).toHaveBeenCalledWith('u1');
    expect(notifySuccess).toHaveBeenCalledWith('Usuario eliminado');
  });

  it('si se cancela no elimina', async () => {
    jest.mocked(confirm).mockResolvedValue(false);
    await render(<AdminScreen />);
    await act(async () => await fireEvent.press(screen.getByLabelText('Eliminar usuario01')));

    expect(mockMutations.deleteUser).not.toHaveBeenCalled();
  });

  it('si falla eliminar avisa con notifyError', async () => {
    mockMutations.deleteUser.mockRejectedValue(new ApiError('No se puede', 409));
    await render(<AdminScreen />);
    await act(async () => await fireEvent.press(screen.getByLabelText('Eliminar usuario01')));

    expect(notifyError).toHaveBeenCalledWith('No se puede');
  });

  it('crear usuario: valida, envía, cierra y avisa', async () => {
    jest.useFakeTimers();
    await render(<AdminScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Crear usuario' }));

    await fireEvent.changeText(screen.getByLabelText('Usuario, obligatorio'), 'abc');
    await act(async () => await fireEvent.press(screen.getAllByRole('button', { name: 'Crear usuario' }).at(-1)!));
    expect(screen.getByText('Debe tener al menos 6 caracteres')).toBeTruthy();
    expect(mockMutations.createUser).not.toHaveBeenCalled();

    await fireEvent.changeText(screen.getByLabelText('Usuario, obligatorio'), 'nuevo01');
    await fireEvent.changeText(screen.getByLabelText('Nombre, obligatorio'), 'Nuevo Usuario');
    await fireEvent.changeText(screen.getByLabelText('Contraseña inicial, obligatorio'), 'password123');
    await fireEvent.changeText(screen.getByLabelText('Confirmar contraseña, obligatorio'), 'password123');
    await act(async () => await fireEvent.press(screen.getAllByRole('button', { name: 'Crear usuario' }).at(-1)!));

    expect(mockMutations.createUser).toHaveBeenCalledWith({
      username: 'nuevo01',
      name: 'Nuevo Usuario',
      password: 'password123',
    });
    await act(async () => {
      jest.advanceTimersByTime(SHEET_EXIT_MS + 50);
    });
    expect(notifySuccess).toHaveBeenCalledWith('Usuario creado');
    jest.useRealTimers();
  });

  it('un usuario duplicado se muestra en un Banner y no cierra', async () => {
    mockMutations.createUser.mockRejectedValue(new ApiError('El usuario ya existe', 409));
    await render(<AdminScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Crear usuario' }));
    await fireEvent.changeText(screen.getByLabelText('Usuario, obligatorio'), 'usuario01');
    await fireEvent.changeText(screen.getByLabelText('Nombre, obligatorio'), 'Otra Ana');
    await fireEvent.changeText(screen.getByLabelText('Contraseña inicial, obligatorio'), 'password123');
    await fireEvent.changeText(screen.getByLabelText('Confirmar contraseña, obligatorio'), 'password123');
    await act(async () => await fireEvent.press(screen.getAllByRole('button', { name: 'Crear usuario' }).at(-1)!));

    expect(screen.getByText('El usuario ya existe')).toBeTruthy();
    expect(notifySuccess).not.toHaveBeenCalled();
  });
});
