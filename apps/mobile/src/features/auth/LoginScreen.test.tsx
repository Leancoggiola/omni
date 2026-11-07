import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { ApiError } from '@omni/shared/api';

import { LoginScreen } from './LoginScreen';

const mockLogin = jest.fn();
const mockEnsureServerAwake = jest.fn();
const mockGetRememberedUser = jest.fn();
const mockSetRememberedUser = jest.fn();
const mockClearRememberedUser = jest.fn();

jest.mock('tamagui', () => jest.requireActual('@/test/tamaguiMock'));
jest.mock('@/core/theme', () => jest.requireActual('@/test/themeMock'));
jest.mock('@/core/auth', () => ({ useAuth: () => ({ login: mockLogin }) }));
jest.mock('@/shared/api', () => ({
  ensureServerAwake: () => mockEnsureServerAwake(),
  getRememberedUser: () => mockGetRememberedUser(),
  setRememberedUser: (username: string) => mockSetRememberedUser(username),
  clearRememberedUser: () => mockClearRememberedUser(),
}));
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default
);
jest.mock('./components/AuthBackground', () => ({ AuthBackground: () => null }));

const renderLogin = async () => {
  render(<LoginScreen />);
  await screen.findByRole('button', { name: 'Ingresar' });
};

const submit = () => fireEvent.press(screen.getByRole('button', { name: 'Ingresar' }));

beforeEach(() => {
  mockLogin.mockReset();
  mockEnsureServerAwake.mockReset().mockResolvedValue(true);
  mockGetRememberedUser.mockReset().mockResolvedValue(null);
  mockSetRememberedUser.mockReset().mockResolvedValue(undefined);
  mockClearRememberedUser.mockReset().mockResolvedValue(undefined);
});

describe('LoginScreen', () => {
  it('muestra el título de bienvenida, los campos y el botón siempre habilitado', async () => {
    await renderLogin();

    expect(screen.getByRole('header', { name: '¡Te damos la bienvenida a Omni!' })).toBeTruthy();
    expect(screen.getByLabelText('Usuario')).toBeTruthy();
    expect(screen.getByLabelText('Contraseña')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Ingresar', disabled: false })).toBeTruthy();
  });

  it('enviar vacío muestra el error de cada campo y no llama a login', async () => {
    await renderLogin();
    submit();

    expect(mockLogin).not.toHaveBeenCalled();
    expect(screen.getByText('Debe tener al menos 6 caracteres')).toBeTruthy();
    expect(screen.getByText('La contraseña es requerida')).toBeTruthy();
  });

  it('un usuario inválido marca solo ese campo y editarlo limpia su error', async () => {
    await renderLogin();
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
    await renderLogin();
    fireEvent.changeText(screen.getByLabelText('Usuario'), '  Admin01 ');
    fireEvent.changeText(screen.getByLabelText('Contraseña'), 'secreto');
    await act(async () => submit());

    expect(mockLogin).toHaveBeenCalledWith('admin01', 'secreto');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('mientras envía el botón queda ocupado y no envía dos veces', async () => {
    let finish!: () => void;
    mockLogin.mockReturnValue(new Promise<void>(resolve => (finish = resolve)));
    await renderLogin();
    fireEvent.changeText(screen.getByLabelText('Usuario'), 'admin01');
    fireEvent.changeText(screen.getByLabelText('Contraseña'), 'secreto');
    submit();

    expect(screen.getByRole('button', { name: 'Ingresar', busy: true })).toBeTruthy();
    submit();
    fireEvent(screen.getByLabelText('Contraseña'), 'submitEditing');
    expect(mockLogin).toHaveBeenCalledTimes(1);

    await act(async () => finish());
    expect(screen.getByRole('button', { name: 'Ingresar', busy: false })).toBeTruthy();
  });

  it('mientras envía los campos y el ojo de la contraseña quedan deshabilitados', async () => {
    let finish!: () => void;
    mockLogin.mockReturnValue(new Promise<void>(resolve => (finish = resolve)));
    await renderLogin();
    fireEvent.changeText(screen.getByLabelText('Usuario'), 'admin01');
    fireEvent.changeText(screen.getByLabelText('Contraseña'), 'secreto');
    submit();

    expect(screen.getByLabelText('Usuario')).toHaveProp('editable', false);
    expect(screen.getByLabelText('Contraseña')).toHaveProp('editable', false);
    expect(screen.getByRole('button', { name: 'Mostrar contraseña', disabled: true })).toBeTruthy();

    await act(async () => finish());
    expect(screen.getByLabelText('Usuario')).toHaveProp('editable', true);
    expect(screen.getByRole('button', { name: 'Mostrar contraseña', disabled: false })).toBeTruthy();
  });

  it('al montar sondea el health para despertar la API', async () => {
    await renderLogin();
    expect(mockEnsureServerAwake).toHaveBeenCalledTimes(1);
  });

  it('el error del servidor se muestra en un Banner destructivo', async () => {
    mockLogin.mockRejectedValue(new ApiError('Usuario o contraseña incorrectos', 401));
    await renderLogin();
    fireEvent.changeText(screen.getByLabelText('Usuario'), 'admin01');
    fireEvent.changeText(screen.getByLabelText('Contraseña'), 'mala');
    await act(async () => submit());

    expect(screen.getByRole('alert', { name: 'Usuario o contraseña incorrectos' })).toBeTruthy();
    expect(screen.getByText('Usuario o contraseña incorrectos')).toHaveProp('color', '$destructive');
  });

  it('si la validación local falla, el error del servidor anterior deja de mostrarse', async () => {
    mockLogin.mockRejectedValue(new ApiError('Credenciales inválidas', 401));
    await renderLogin();
    fireEvent.changeText(screen.getByLabelText('Usuario'), 'admin01');
    fireEvent.changeText(screen.getByLabelText('Contraseña'), 'mala');
    await act(async () => submit());
    expect(screen.getByRole('alert', { name: 'Credenciales inválidas' })).toBeTruthy();

    fireEvent.changeText(screen.getByLabelText('Contraseña'), '');
    submit();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByText('La contraseña es requerida')).toBeTruthy();
  });

  it.each([
    ['no es Error', 'boom'],
    ['es de red', new TypeError('Network request failed')],
  ])('un error que %s cae al mensaje genérico', async (_label, reason) => {
    mockLogin.mockRejectedValue(reason);
    await renderLogin();
    fireEvent.changeText(screen.getByLabelText('Usuario'), 'admin01');
    fireEvent.changeText(screen.getByLabelText('Contraseña'), 'mala');
    await act(async () => submit());

    expect(screen.getByRole('alert', { name: 'Error al iniciar sesión' })).toBeTruthy();
  });

  it('configura el teclado para encadenar: "siguiente" en usuario y "ir" en contraseña', async () => {
    await renderLogin();
    expect(screen.getByLabelText('Usuario')).toHaveProp('returnKeyType', 'next');
    expect(screen.getByLabelText('Contraseña')).toHaveProp('returnKeyType', 'go');
  });

  it('Enter en la contraseña envía el formulario', async () => {
    mockLogin.mockResolvedValue(undefined);
    await renderLogin();
    fireEvent.changeText(screen.getByLabelText('Usuario'), 'admin01');
    fireEvent.changeText(screen.getByLabelText('Contraseña'), 'secreto');
    await act(async () => fireEvent(screen.getByLabelText('Contraseña'), 'submitEditing'));

    expect(mockLogin).toHaveBeenCalledWith('admin01', 'secreto');
  });

  describe('usuario recordado', () => {
    const renderRemembered = async () => {
      mockGetRememberedUser.mockResolvedValue('admin01');
      render(<LoginScreen />);
      await screen.findByText('Ingresando como admin01');
    };

    it('guarda solo el usuario normalizado tras un login exitoso', async () => {
      mockLogin.mockResolvedValue(undefined);
      await renderLogin();
      fireEvent.changeText(screen.getByLabelText('Usuario'), '  Admin01 ');
      fireEvent.changeText(screen.getByLabelText('Contraseña'), 'secreto');
      await act(async () => submit());

      expect(mockSetRememberedUser).toHaveBeenCalledTimes(1);
      expect(mockSetRememberedUser).toHaveBeenCalledWith('admin01');
    });

    it('no guarda nada si el login falla', async () => {
      mockLogin.mockRejectedValue(new ApiError('Credenciales inválidas', 401));
      await renderLogin();
      fireEvent.changeText(screen.getByLabelText('Usuario'), 'admin01');
      fireEvent.changeText(screen.getByLabelText('Contraseña'), 'mala');
      await act(async () => submit());

      expect(mockSetRememberedUser).not.toHaveBeenCalled();
    });

    it('sin usuario guardado muestra el formulario completo y sin enlace', async () => {
      await renderLogin();

      expect(screen.getByLabelText('Usuario')).toBeTruthy();
      expect(screen.queryByText('Ingresar con otro usuario')).toBeNull();
    });

    it('con usuario guardado muestra avatar, saludo y solo la contraseña', async () => {
      await renderRemembered();

      expect(screen.getByText('A')).toBeTruthy();
      expect(screen.getByText('Ingresando como admin01')).toBeTruthy();
      expect(screen.queryByText('Ingresá a tu cuenta')).toBeNull();
      expect(screen.queryByText('¡Te damos la bienvenida a Omni!')).toBeNull();
      expect(screen.getByPlaceholderText('Contraseña')).toBeTruthy();
      expect(screen.getByRole('header', { name: '¡Hola, Admin01!' })).toBeTruthy();
      expect(screen.queryByLabelText('Usuario')).toBeNull();
      expect(screen.getByLabelText('Contraseña')).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Mostrar contraseña' })).toBeTruthy();
      expect(screen.getByText('Ingresar con otro usuario')).toBeTruthy();
      expect(screen.queryByText('Ingresar con huella')).toBeNull();
    });

    it('ingresa con el usuario recordado y la contraseña escrita', async () => {
      mockLogin.mockResolvedValue(undefined);
      await renderRemembered();
      fireEvent.changeText(screen.getByLabelText('Contraseña'), 'secreto');
      await act(async () => submit());

      expect(mockLogin).toHaveBeenCalledWith('admin01', 'secreto');
    });

    it('mantiene la validación de la contraseña y el sondeo del health', async () => {
      await renderRemembered();
      submit();

      expect(mockLogin).not.toHaveBeenCalled();
      expect(screen.getByText('La contraseña es requerida')).toBeTruthy();
      expect(mockEnsureServerAwake).toHaveBeenCalledTimes(1);
    });

    it('mientras carga deshabilita la contraseña y el enlace', async () => {
      let finish!: () => void;
      mockLogin.mockReturnValue(new Promise<void>(resolve => (finish = resolve)));
      await renderRemembered();
      fireEvent.changeText(screen.getByLabelText('Contraseña'), 'secreto');
      submit();

      expect(screen.getByLabelText('Contraseña')).toHaveProp('editable', false);
      expect(screen.getByRole('button', { name: 'Ingresar con otro usuario', disabled: true })).toBeTruthy();

      await act(async () => finish());
    });

    it('"Ingresar con otro usuario" olvida al usuario y vuelve al formulario completo', async () => {
      await renderRemembered();
      fireEvent.changeText(screen.getByLabelText('Contraseña'), 'secreto');
      fireEvent.press(screen.getByText('Ingresar con otro usuario'));

      expect(mockClearRememberedUser).toHaveBeenCalledTimes(1);
      expect(screen.getByLabelText('Usuario')).toHaveProp('value', '');
      expect(screen.getByLabelText('Contraseña')).toHaveProp('value', '');
      expect(screen.queryByText('Ingresar con otro usuario')).toBeNull();
      expect(screen.getByRole('header', { name: 'Ingresá a tu cuenta' })).toBeTruthy();
    });
  });
});
