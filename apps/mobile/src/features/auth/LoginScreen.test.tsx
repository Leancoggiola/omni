import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Dimensions, Keyboard, TextInput } from 'react-native';

import { ApiError } from '@omni/shared/api';

import { notifyWarning } from '@/shared/ui';

import { LoginScreen } from './LoginScreen';

const mockLogin = jest.fn();
const mockLogout = jest.fn();
const mockAuth = { isAuthenticated: false };
const mockUnlock = jest.fn();
const mockMarkUnlocked = jest.fn();
const mockDisableBiometrics = jest.fn();
const mockBiometrics = { locked: false, kind: 'fingerprint', noun: 'huella' };
const mockEnsureServerAwake = jest.fn();
const mockGetRememberedUser = jest.fn();
const mockSetRememberedUser = jest.fn();
const mockClearRememberedUser = jest.fn();

jest.mock('tamagui', () => jest.requireActual('@/test/tamaguiMock'));
jest.mock('@/core/theme', () => jest.requireActual('@/test/themeMock'));
jest.mock('@/core/auth', () => ({
  useAuth: () => ({ login: mockLogin, logout: mockLogout, isAuthenticated: mockAuth.isAuthenticated }),
}));
jest.mock('@/core/biometrics', () => ({
  biometricIcon: jest.requireActual('@/core/biometrics/biometricIcon').biometricIcon,
  useBiometrics: () => ({
    ...mockBiometrics,
    unlock: mockUnlock,
    markUnlocked: mockMarkUnlocked,
    disable: mockDisableBiometrics,
  }),
}));
jest.mock('@/shared/ui', () => ({ ...jest.requireActual('@/shared/ui'), notifyWarning: jest.fn() }));
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

const focusSpy = jest.spyOn(TextInput.prototype, 'focus');

type KeyboardListener = (event: { endCoordinates: { screenY: number } }) => void;
const keyboardListeners: Record<string, KeyboardListener> = {};

const openKeyboard = () => act(() => keyboardListeners.keyboardDidShow({ endCoordinates: { screenY: 556 } }));
const closeKeyboard = () => act(() => keyboardListeners.keyboardDidHide({ endCoordinates: { screenY: 844 } }));

const renderLogin = async () => {
  render(<LoginScreen />);
  await screen.findByRole('button', { name: 'Ingresar' });
};

const submit = () => fireEvent.press(screen.getByRole('button', { name: 'Ingresar' }));

let dimensionsSpy: jest.SpyInstance;
let keyboardSpy: jest.SpyInstance;

beforeEach(() => {
  mockLogin.mockReset();
  mockLogout.mockReset().mockResolvedValue(undefined);
  mockUnlock.mockReset().mockResolvedValue('success');
  mockMarkUnlocked.mockReset();
  mockDisableBiometrics.mockReset().mockResolvedValue(undefined);
  mockAuth.isAuthenticated = false;
  Object.assign(mockBiometrics, { locked: false, kind: 'fingerprint', noun: 'huella' });
  jest.mocked(notifyWarning).mockClear();
  mockEnsureServerAwake.mockReset().mockResolvedValue(true);
  mockGetRememberedUser.mockReset().mockResolvedValue(null);
  mockSetRememberedUser.mockReset().mockResolvedValue(undefined);
  mockClearRememberedUser.mockReset().mockResolvedValue(undefined);
  focusSpy.mockClear();
  dimensionsSpy = jest.spyOn(Dimensions, 'get').mockReturnValue({ width: 390, height: 844, scale: 1, fontScale: 1 });
  keyboardSpy = jest.spyOn(Keyboard, 'addListener').mockImplementation(((name: string, listener: KeyboardListener) => {
    keyboardListeners[name] = listener;
    return { remove: jest.fn() };
  }) as unknown as typeof Keyboard.addListener);
});

afterEach(() => {
  dimensionsSpy.mockRestore();
  keyboardSpy.mockRestore();
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

  it('los campos piden "siguiente" / "ir" al teclado y el autofill de usuario y contraseña', async () => {
    await renderLogin();
    expect(screen.getByLabelText('Usuario')).toHaveProp('enterKeyHint', 'next');
    expect(screen.getByLabelText('Usuario')).toHaveProp('autoComplete', 'username');
    expect(screen.getByLabelText('Contraseña')).toHaveProp('enterKeyHint', 'go');
    expect(screen.getByLabelText('Contraseña')).toHaveProp('autoComplete', 'current-password');
  });

  it('los campos miden 52 con fuente de 16 y el botón principal, 56', async () => {
    await renderLogin();
    for (const label of ['Usuario', 'Contraseña']) {
      expect(screen.getByLabelText(label)).toHaveProp('height', 52);
      expect(screen.getByLabelText(label)).toHaveProp('fontSize', 16);
    }
    expect(screen.getByRole('button', { name: 'Ingresar' })).toHaveProp('height', 56);
    expect(screen.getByText('Ingresar')).toHaveProp('fontSize', 16);
  });

  describe('con el teclado abierto', () => {
    it('compacta el hero en una línea, saca el título de la hoja y deja "Ingresar" a la vista', async () => {
      await renderLogin();
      const title = () => screen.getByRole('header', { name: '¡Te damos la bienvenida a Omni!' });
      expect(title()).toHaveProp('fontSize', 32);
      expect(title()).toHaveProp('textAlign', 'center');

      openKeyboard();
      expect(title()).toHaveProp('fontSize', 24);
      expect(title()).toHaveProp('textAlign', 'left');
      expect(screen.queryByText('Ingresá a tu cuenta')).toBeNull();
      expect(screen.getByLabelText('Usuario')).toBeTruthy();
      expect(screen.getByLabelText('Contraseña')).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Ingresar', disabled: false })).toBeTruthy();
    });

    it('al cerrarse vuelve el hero completo y el título de la hoja', async () => {
      await renderLogin();
      openKeyboard();
      closeKeyboard();

      expect(screen.getByRole('header', { name: '¡Te damos la bienvenida a Omni!' })).toHaveProp('fontSize', 32);
      expect(screen.getByRole('header', { name: 'Ingresá a tu cuenta' })).toBeTruthy();
    });

    it('mantiene el error del servidor y la validación por campo en la hoja', async () => {
      mockLogin.mockRejectedValue(new ApiError('Credenciales inválidas', 401));
      await renderLogin();
      openKeyboard();
      fireEvent.changeText(screen.getByLabelText('Usuario'), 'admin01');
      fireEvent.changeText(screen.getByLabelText('Contraseña'), 'mala');
      await act(async () => submit());
      expect(screen.getByRole('alert', { name: 'Credenciales inválidas' })).toBeTruthy();

      fireEvent.changeText(screen.getByLabelText('Contraseña'), '');
      submit();
      expect(screen.getByText('La contraseña es requerida')).toBeTruthy();
    });

    it('con usuario recordado compacta el saludo y conserva la contraseña y el enlace', async () => {
      mockGetRememberedUser.mockResolvedValue('admin01');
      render(<LoginScreen />);
      await screen.findByText('Ingresando como admin01');
      openKeyboard();

      expect(screen.getByRole('header', { name: '¡Hola, Admin01!' })).toHaveProp('fontSize', 24);
      expect(screen.getByText('Ingresando como admin01')).toBeTruthy();
      expect(screen.getByLabelText('Contraseña')).toHaveProp('height', 52);
      expect(screen.getByRole('button', { name: 'Ingresar' })).toBeTruthy();
      expect(screen.getByText('Ingresar con otro usuario')).toBeTruthy();
    });
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

    it('si el usuario guardado no es válido, vuelve al formulario completo y muestra el error', async () => {
      mockGetRememberedUser.mockResolvedValue('a');
      render(<LoginScreen />);
      await screen.findByText('Ingresando como a');
      fireEvent.changeText(screen.getByLabelText('Contraseña'), 'secreto');
      await act(async () => submit());

      expect(mockLogin).not.toHaveBeenCalled();
      expect(mockClearRememberedUser).toHaveBeenCalledTimes(1);
      expect(screen.getByLabelText('Usuario')).toBeTruthy();
      expect(screen.queryByText('Ingresar con otro usuario')).toBeNull();
      expect(focusSpy).toHaveBeenCalledTimes(1);
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
      expect(focusSpy).toHaveBeenCalledTimes(1);
    });
  });
  describe('biometría (#173)', () => {
    const renderLocked = async (remembered: string | null = 'admin01') => {
      mockGetRememberedUser.mockResolvedValue(remembered);
      mockAuth.isAuthenticated = true;
      mockBiometrics.locked = true;
      render(<LoginScreen />);
      await screen.findByRole('button', { name: 'Ingresar con huella' });
    };

    it('sin bloqueo (biometría desactivada o sin biometría en el teléfono) no muestra nada relacionado', async () => {
      mockGetRememberedUser.mockResolvedValue('admin01');
      render(<LoginScreen />);
      await screen.findByText('Ingresando como admin01');

      expect(screen.queryByText(/Ingresar con (huella|rostro|biometría)/)).toBeNull();
      expect(screen.queryByText('o')).toBeNull();
      expect(screen.getByRole('button', { name: 'Ingresar' })).toBeTruthy();
    });

    it('bloqueado y con sesión guardada ofrece la biometría como acción principal, con la contraseña debajo', async () => {
      await renderLocked();

      expect(screen.getByRole('button', { name: 'Ingresar con huella' })).toBeTruthy();
      expect(screen.getByText('o')).toBeTruthy();
      expect(screen.getByLabelText('Contraseña')).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Ingresar' })).toBeTruthy();
    });

    it('adapta el texto al tipo de biometría', async () => {
      mockBiometrics.kind = 'face';
      mockBiometrics.noun = 'rostro';
      mockGetRememberedUser.mockResolvedValue('admin01');
      mockAuth.isAuthenticated = true;
      mockBiometrics.locked = true;
      render(<LoginScreen />);

      expect(await screen.findByRole('button', { name: 'Ingresar con rostro' })).toBeTruthy();
      expect(screen.queryByText('Ingresar con huella')).toBeNull();
    });

    it('bloqueado pero sin sesión guardada (después de cerrar sesión) no hay nada que liberar: sin botón', async () => {
      mockGetRememberedUser.mockResolvedValue('admin01');
      mockBiometrics.locked = true;
      render(<LoginScreen />);
      await screen.findByText('Ingresando como admin01');

      expect(screen.queryByText('Ingresar con huella')).toBeNull();
    });

    it('al tocarlo pide la biometría y no llama a login ni toca la contraseña', async () => {
      await renderLocked();
      await act(async () => fireEvent.press(screen.getByRole('button', { name: 'Ingresar con huella' })));

      expect(mockUnlock).toHaveBeenCalledTimes(1);
      expect(mockLogin).not.toHaveBeenCalled();
      expect(screen.queryByRole('alert')).toBeNull();
    });

    it('si se cancela no avisa nada y la contraseña sigue disponible', async () => {
      mockUnlock.mockResolvedValue('cancelled');
      await renderLocked();
      await act(async () => fireEvent.press(screen.getByRole('button', { name: 'Ingresar con huella' })));

      expect(screen.queryByText(/No se pudo verificar/)).toBeNull();
      expect(screen.getByRole('button', { name: 'Ingresar con huella', busy: false })).toBeTruthy();
      expect(screen.getByLabelText('Contraseña')).toBeTruthy();
    });

    it('si falla avisa, manda el foco a la contraseña y se puede reintentar', async () => {
      mockUnlock.mockResolvedValue('failed');
      await renderLocked();
      await act(async () => fireEvent.press(screen.getByRole('button', { name: 'Ingresar con huella' })));

      expect(screen.getByText('No se pudo verificar tu huella. Ingresá con tu contraseña.')).toBeTruthy();
      expect(focusSpy).toHaveBeenCalled();
      expect(screen.getByRole('button', { name: 'Ingresar con huella', busy: false })).toBeTruthy();
    });

    it('mientras el prompt está abierto el botón queda cargando y no se puede tocar la contraseña ni el resto', async () => {
      let finish!: (result: string) => void;
      mockUnlock.mockReturnValue(new Promise(resolve => (finish = resolve)));
      await renderLocked();
      fireEvent.press(screen.getByRole('button', { name: 'Ingresar con huella' }));

      expect(screen.getByRole('button', { name: 'Ingresar con huella', busy: true })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Ingresar con otro usuario', disabled: true })).toBeTruthy();
      fireEvent.press(screen.getByRole('button', { name: 'Ingresar con huella' }));
      expect(mockUnlock).toHaveBeenCalledTimes(1);

      await act(async () => finish('cancelled'));
      expect(screen.getByRole('button', { name: 'Ingresar con huella', busy: false })).toBeTruthy();
    });

    it('la contraseña es la alternativa: autentica contra el servidor y libera el bloqueo', async () => {
      mockLogin.mockResolvedValue(undefined);
      await renderLocked();
      fireEvent.changeText(screen.getByLabelText('Contraseña'), 'secreto');
      await act(async () => submit());

      expect(mockLogin).toHaveBeenCalledWith('admin01', 'secreto');
      expect(mockMarkUnlocked).toHaveBeenCalledTimes(1);
    });

    it('un login con contraseña que falla no libera el bloqueo', async () => {
      mockLogin.mockRejectedValue(new ApiError('Credenciales inválidas', 401));
      await renderLocked();
      fireEvent.changeText(screen.getByLabelText('Contraseña'), 'mala');
      await act(async () => submit());

      expect(mockMarkUnlocked).not.toHaveBeenCalled();
      expect(screen.getByText('Credenciales inválidas')).toBeTruthy();
    });

    it('"Ingresar con otro usuario" con el bloqueo puesto cierra antes la sesión guardada y desactiva la biometría', async () => {
      await renderLocked();
      await act(async () => fireEvent.press(screen.getByText('Ingresar con otro usuario')));

      expect(mockLogout).toHaveBeenCalledTimes(1);
      expect(mockDisableBiometrics).toHaveBeenCalledTimes(1);
      expect(mockClearRememberedUser).toHaveBeenCalledTimes(1);
      expect(screen.getByLabelText('Usuario')).toBeTruthy();
    });

    it('si no se pueden borrar los datos locales igual cambia de usuario y avisa', async () => {
      mockLogout.mockRejectedValue(new Error('SecureStore'));
      await renderLocked();
      await act(async () => fireEvent.press(screen.getByText('Ingresar con otro usuario')));

      expect(notifyWarning).toHaveBeenCalledWith(
        'No se pudieron borrar los datos de la sesión anterior de este celular.'
      );
      expect(mockClearRememberedUser).toHaveBeenCalledTimes(1);
      expect(screen.getByLabelText('Usuario')).toBeTruthy();
    });

    it('sin bloqueo, "Ingresar con otro usuario" no cierra ninguna sesión pero igual desactiva la biometría', async () => {
      mockGetRememberedUser.mockResolvedValue('admin01');
      render(<LoginScreen />);
      await screen.findByText('Ingresando como admin01');
      await act(async () => fireEvent.press(screen.getByText('Ingresar con otro usuario')));

      expect(mockLogout).not.toHaveBeenCalled();
      expect(mockDisableBiometrics).toHaveBeenCalledTimes(1);
    });
  });
});
