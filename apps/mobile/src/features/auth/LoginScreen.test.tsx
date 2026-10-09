import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { LoginScreen } from './LoginScreen';

const mockLogin = jest.fn();

jest.mock('tamagui', () => jest.requireActual('@/test/tamaguiMock'));
jest.mock('@/core/theme', () => jest.requireActual('@/test/themeMock'));
jest.mock('@/core/auth', () => ({ useAuth: () => ({ login: mockLogin }) }));
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default
);
jest.mock('./components/AuthBackground', () => ({ AuthBackground: () => null }));

const submit = () => fireEvent.press(screen.getByRole('button', { name: 'Ingresar' }));

beforeEach(() => {
  mockLogin.mockReset();
});

describe('LoginScreen', () => {
  it('muestra el título de bienvenida, los campos y el botón siempre habilitado', () => {
    render(<LoginScreen />);

    expect(screen.getByRole('header', { name: '¡Te damos la bienvenida a Omni!' })).toBeTruthy();
    expect(screen.getByLabelText('Usuario')).toBeTruthy();
    expect(screen.getByLabelText('Contraseña')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Ingresar', disabled: false })).toBeTruthy();
  });

  it('enviar vacío muestra el error de cada campo y no llama a login', () => {
    render(<LoginScreen />);
    submit();

    expect(mockLogin).not.toHaveBeenCalled();
    expect(screen.getByText('Debe tener al menos 6 caracteres')).toBeTruthy();
    expect(screen.getByText('La contraseña es requerida')).toBeTruthy();
  });

  it('un usuario inválido marca solo ese campo y editarlo limpia su error', () => {
    render(<LoginScreen />);
    fireEvent.changeText(screen.getByLabelText('Usuario'), 'ab');
    fireEvent.changeText(screen.getByLabelText('Contraseña'), 'secreto');
    submit();

    expect(screen.getByText('Debe tener al menos 6 caracteres')).toBeTruthy();
    expect(screen.queryByText('La contraseña es requerida')).toBeNull();
    expect(mockLogin).not.toHaveBeenCalled();

    fireEvent.changeText(screen.getByLabelText('Usuario'), 'abc');
    expect(screen.queryByText('Debe tener al menos 6 caracteres')).toBeNull();
  });

  it('con datos válidos llama a login con el usuario normalizado (minúsculas, sin espacios)', async () => {
    mockLogin.mockResolvedValue(undefined);
    render(<LoginScreen />);
    fireEvent.changeText(screen.getByLabelText('Usuario'), '  Admin01 ');
    fireEvent.changeText(screen.getByLabelText('Contraseña'), 'secreto');
    await act(async () => submit());

    expect(mockLogin).toHaveBeenCalledWith('admin01', 'secreto');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('mientras envía el botón queda ocupado y no envía dos veces', async () => {
    let finish!: () => void;
    mockLogin.mockReturnValue(new Promise<void>(resolve => (finish = resolve)));
    render(<LoginScreen />);
    fireEvent.changeText(screen.getByLabelText('Usuario'), 'admin01');
    fireEvent.changeText(screen.getByLabelText('Contraseña'), 'secreto');
    submit();

    expect(screen.getByRole('button', { name: 'Ingresar', busy: true })).toBeTruthy();
    // El botón ocupado ignora el toque; el guard también cubre Enter en la contraseña.
    submit();
    fireEvent(screen.getByLabelText('Contraseña'), 'submitEditing');
    expect(mockLogin).toHaveBeenCalledTimes(1);

    await act(async () => finish());
    expect(screen.getByRole('button', { name: 'Ingresar', busy: false })).toBeTruthy();
  });

  it('el error del servidor se muestra en un Banner destructivo', async () => {
    mockLogin.mockRejectedValue(new Error('Usuario o contraseña incorrectos'));
    render(<LoginScreen />);
    fireEvent.changeText(screen.getByLabelText('Usuario'), 'admin01');
    fireEvent.changeText(screen.getByLabelText('Contraseña'), 'mala');
    await act(async () => submit());

    expect(screen.getByRole('alert', { name: 'Usuario o contraseña incorrectos' })).toBeTruthy();
    expect(screen.getByText('Usuario o contraseña incorrectos')).toHaveProp('color', '$destructive');
  });

  it('si la validación local falla, el error del servidor anterior deja de mostrarse', async () => {
    mockLogin.mockRejectedValue(new Error('Credenciales inválidas'));
    render(<LoginScreen />);
    fireEvent.changeText(screen.getByLabelText('Usuario'), 'admin01');
    fireEvent.changeText(screen.getByLabelText('Contraseña'), 'mala');
    await act(async () => submit());
    expect(screen.getByRole('alert', { name: 'Credenciales inválidas' })).toBeTruthy();

    fireEvent.changeText(screen.getByLabelText('Contraseña'), '');
    submit();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByText('La contraseña es requerida')).toBeTruthy();
  });

  it('un error que no es Error cae al mensaje genérico', async () => {
    mockLogin.mockRejectedValue('boom');
    render(<LoginScreen />);
    fireEvent.changeText(screen.getByLabelText('Usuario'), 'admin01');
    fireEvent.changeText(screen.getByLabelText('Contraseña'), 'mala');
    await act(async () => submit());

    expect(screen.getByRole('alert', { name: 'Error al iniciar sesión' })).toBeTruthy();
  });

  it('configura el teclado para encadenar: "siguiente" en usuario y "ir" en contraseña', () => {
    render(<LoginScreen />);
    expect(screen.getByLabelText('Usuario')).toHaveProp('returnKeyType', 'next');
    expect(screen.getByLabelText('Contraseña')).toHaveProp('returnKeyType', 'go');
  });

  it('Enter en la contraseña envía el formulario', async () => {
    mockLogin.mockResolvedValue(undefined);
    render(<LoginScreen />);
    fireEvent.changeText(screen.getByLabelText('Usuario'), 'admin01');
    fireEvent.changeText(screen.getByLabelText('Contraseña'), 'secreto');
    await act(async () => fireEvent(screen.getByLabelText('Contraseña'), 'submitEditing'));

    expect(mockLogin).toHaveBeenCalledWith('admin01', 'secreto');
  });
});
