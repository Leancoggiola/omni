import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { confirm, notifyError, notifySuccess, notifyWarning } from '@/shared/ui';

import { ProfileScreen } from './ProfileScreen';

import type { UserProfile } from '@omni/shared/users';

const mockProfile = jest.fn();
const mockUpdateProfile = jest.fn();
const mockUpdatePreferences = jest.fn();
const mockChangePassword = jest.fn();
const mockDeleteAccount = jest.fn();
const mockLogout = jest.fn();
const mockClearOverride = jest.fn();
const mockRefresh = jest.fn();
const mockBack = jest.fn();

jest.mock('tamagui', () => jest.requireActual('@/test/tamaguiMock'));
jest.mock('@/core/theme', () => ({
  ...jest.requireActual('@/test/themeMock'),
  useColorSchemeControl: () => ({ clearOverride: mockClearOverride }),
}));
jest.mock('@/core/auth', () => ({ useAuth: () => ({ logout: mockLogout }) }));
jest.mock('expo-router', () => ({ useRouter: () => ({ back: mockBack, canGoBack: () => true, replace: jest.fn() }) }));
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default
);
jest.mock('@/shared/ui', () => ({
  ...jest.requireActual('@/shared/ui'),
  confirm: jest.fn(),
  notifySuccess: jest.fn(),
  notifyError: jest.fn(),
  notifyWarning: jest.fn(),
}));
jest.mock('./hooks', () => ({
  useProfile: () => mockProfile(),
  useAccountActions: () => ({ changePassword: mockChangePassword, deleteAccount: mockDeleteAccount }),
}));

const PROFILE: UserProfile = {
  id: 'u1',
  username: 'admin',
  name: 'Admin Omni',
  email: 'admin@omni.dev',
  role: 'ADMIN',
  avatarUrl: null,
  phone: '123',
  birthDate: null,
  createdAt: '',
  updatedAt: '',
  preferences: { id: 'p1', userId: 'u1', notifications: false, theme: 'light', createdAt: '', updatedAt: '' },
};

function renderProfile(overrides: Partial<ReturnType<typeof mockProfile>> = {}) {
  mockProfile.mockReturnValue({
    profile: PROFILE,
    error: undefined,
    isLoading: false,
    refresh: mockRefresh,
    updateProfile: mockUpdateProfile,
    updatePreferences: mockUpdatePreferences,
    ...overrides,
  });
  return render(<ProfileScreen />);
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('ProfileScreen · carga y error', () => {
  it('muestra el spinner mientras carga, sin formulario', () => {
    renderProfile({ profile: null, isLoading: true });

    expect(screen.getByTestId('spinner')).toBeTruthy();
    expect(screen.queryByText('Información personal')).toBeNull();
    expect(screen.getByRole('button', { name: 'Volver' })).toBeTruthy();
  });

  it('un error de SWR sin datos se muestra como ErrorState con Reintentar, no como pantalla vacía', () => {
    renderProfile({ profile: null, error: new Error('boom') });

    expect(screen.getByText('No se pudo cargar tu perfil')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it('el botón de volver regresa a la pantalla anterior', () => {
    renderProfile();
    fireEvent.press(screen.getByRole('button', { name: 'Volver' }));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('no ofrece cerrar sesión: vive en Más', () => {
    renderProfile();
    expect(screen.queryByRole('button', { name: 'Cerrar sesión' })).toBeNull();
  });
});

describe('ProfileScreen · información personal', () => {
  it('nombre y email van deshabilitados con "No se puede editar" y el teléfono es editable', () => {
    renderProfile();

    expect(screen.getAllByText('No se puede editar')).toHaveLength(2);
    expect(screen.getByLabelText('Nombre completo', { exact: false })).toBeDisabled();
    expect(screen.getByLabelText('Email', { exact: false })).toBeDisabled();
    expect(screen.getByLabelText('Teléfono', { exact: false })).toBeEnabled();
  });

  it('"Guardar cambios" está deshabilitado hasta que cambia el teléfono', () => {
    renderProfile();
    expect(screen.getByRole('button', { name: 'Guardar cambios', disabled: true })).toBeTruthy();

    fireEvent.changeText(screen.getByLabelText('Teléfono', { exact: false }), '456');
    expect(screen.getByRole('button', { name: 'Guardar cambios', disabled: false })).toBeTruthy();

    fireEvent.changeText(screen.getByLabelText('Teléfono', { exact: false }), '123');
    expect(screen.getByRole('button', { name: 'Guardar cambios', disabled: true })).toBeTruthy();
  });

  it('si el perfil trae otro teléfono y el campo no se tocó, el campo lo sigue y el botón queda deshabilitado', () => {
    const { rerender } = renderProfile();
    mockProfile.mockReturnValue({ ...mockProfile(), profile: { ...PROFILE, phone: '999' } });
    rerender(<ProfileScreen />);

    expect(screen.getByLabelText('Teléfono', { exact: false }).props.value).toBe('999');
    expect(screen.getByRole('button', { name: 'Guardar cambios', disabled: true })).toBeTruthy();
  });

  it('si el perfil trae otro teléfono pero el usuario ya estaba escribiendo, no le pisa lo escrito', () => {
    const { rerender } = renderProfile();
    fireEvent.changeText(screen.getByLabelText('Teléfono', { exact: false }), '456');
    mockProfile.mockReturnValue({ ...mockProfile(), profile: { ...PROFILE, phone: '999' } });
    rerender(<ProfileScreen />);

    expect(screen.getByLabelText('Teléfono', { exact: false }).props.value).toBe('456');
  });

  it('guarda solo el teléfono (sin birthDate) y avisa con un toast', async () => {
    mockUpdateProfile.mockResolvedValue({});
    renderProfile();
    fireEvent.changeText(screen.getByLabelText('Teléfono', { exact: false }), ' 456 ');
    await act(async () => fireEvent.press(screen.getByRole('button', { name: 'Guardar cambios' })));

    expect(mockUpdateProfile).toHaveBeenCalledWith({ phone: '456' });
    expect(notifySuccess).toHaveBeenCalledWith('Cambios guardados correctamente');
  });

  it('si falla el guardado avisa con notifyError y deja el botón habilitado', async () => {
    mockUpdateProfile.mockRejectedValue(new Error('Sin conexión'));
    renderProfile();
    fireEvent.changeText(screen.getByLabelText('Teléfono', { exact: false }), '456');
    await act(async () => fireEvent.press(screen.getByRole('button', { name: 'Guardar cambios' })));

    expect(notifyError).toHaveBeenCalledWith('Sin conexión');
    expect(notifySuccess).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Guardar cambios', disabled: false })).toBeTruthy();
  });
});

describe('ProfileScreen · preferencias', () => {
  it('muestra el valor guardado de notificaciones y tema', () => {
    renderProfile();

    expect(screen.getByRole('switch', { name: 'Notificaciones' })).toHaveProp('accessibilityState', {
      checked: false,
      disabled: false,
    });
    expect(screen.getByRole('radio', { name: 'Claro', checked: true })).toBeTruthy();
  });

  it('guardan al instante: notificaciones manda solo ese campo', async () => {
    mockUpdatePreferences.mockResolvedValue({});
    renderProfile();
    await act(async () => fireEvent.press(screen.getByRole('switch', { name: 'Notificaciones' })));

    expect(mockUpdatePreferences).toHaveBeenCalledWith({ notifications: true });
    expect(mockClearOverride).not.toHaveBeenCalled();
  });

  it('cambiar el tema lo guarda y descarta el override de la sesión', async () => {
    mockUpdatePreferences.mockResolvedValue({});
    renderProfile();
    await act(async () => fireEvent.press(screen.getByRole('radio', { name: 'Sistema' })));

    expect(mockUpdatePreferences).toHaveBeenCalledWith({ theme: 'auto' });
    expect(mockClearOverride).toHaveBeenCalledTimes(1);
  });

  it('muestra el valor nuevo enseguida y, si el PATCH falla, vuelve al anterior con notifyError', async () => {
    let fail!: (error: Error) => void;
    mockUpdatePreferences.mockReturnValue(new Promise((_, reject) => (fail = reject)));
    renderProfile();
    fireEvent.press(screen.getByRole('radio', { name: 'Oscuro' }));

    expect(screen.getByRole('radio', { name: 'Oscuro', checked: true })).toBeTruthy();

    await act(async () => fail(new Error('No hay red')));

    expect(screen.getByRole('radio', { name: 'Claro', checked: true })).toBeTruthy();
    expect(notifyError).toHaveBeenCalledWith('No hay red');
    expect(mockClearOverride).not.toHaveBeenCalled();
  });

  it('ignora un segundo cambio de tema mientras el primero está en vuelo', async () => {
    let finish!: () => void;
    mockUpdatePreferences.mockReturnValue(new Promise<void>(resolve => (finish = resolve)));
    renderProfile();
    fireEvent.press(screen.getByRole('radio', { name: 'Oscuro' }));
    fireEvent.press(screen.getByRole('radio', { name: 'Sistema' }));

    expect(mockUpdatePreferences).toHaveBeenCalledTimes(1);
    await act(async () => finish());
  });
});

describe('ProfileScreen · cambiar contraseña', () => {
  const submit = () => fireEvent.press(screen.getByRole('button', { name: 'Cambiar contraseña' }));

  it('el botón está deshabilitado hasta que se escribe algo', () => {
    renderProfile();
    expect(screen.getByRole('button', { name: 'Cambiar contraseña', disabled: true })).toBeTruthy();

    fireEvent.changeText(screen.getByLabelText('Nueva contraseña', { exact: false }), 'a');
    expect(screen.getByRole('button', { name: 'Cambiar contraseña', disabled: false })).toBeTruthy();
  });

  it('valida al enviar: contraseña corta y confirmación distinta, sin llamar a la API', () => {
    renderProfile();
    fireEvent.changeText(screen.getByLabelText('Nueva contraseña', { exact: false }), '1234');
    fireEvent.changeText(screen.getByLabelText('Confirmar contraseña', { exact: false }), '12345678');
    submit();

    expect(screen.getByText('La contraseña debe tener al menos 8 caracteres')).toBeTruthy();
    expect(screen.getByText('Las contraseñas no coinciden')).toBeTruthy();
    expect(mockChangePassword).not.toHaveBeenCalled();
  });

  it('con datos válidos cambia la contraseña, limpia los campos y avisa', async () => {
    mockChangePassword.mockResolvedValue(undefined);
    renderProfile();
    fireEvent.changeText(screen.getByLabelText('Nueva contraseña', { exact: false }), 'nueva-clave');
    fireEvent.changeText(screen.getByLabelText('Confirmar contraseña', { exact: false }), 'nueva-clave');
    await act(async () => submit());

    expect(mockChangePassword).toHaveBeenCalledWith('nueva-clave');
    expect(notifySuccess).toHaveBeenCalledWith('Contraseña actualizada correctamente');
    expect(screen.getByLabelText('Nueva contraseña', { exact: false })).toHaveDisplayValue('');
  });

  it('si el servidor rechaza, avisa con notifyError y conserva lo escrito', async () => {
    mockChangePassword.mockRejectedValue(new Error('Contraseña reciente'));
    renderProfile();
    fireEvent.changeText(screen.getByLabelText('Nueva contraseña', { exact: false }), 'nueva-clave');
    fireEvent.changeText(screen.getByLabelText('Confirmar contraseña', { exact: false }), 'nueva-clave');
    await act(async () => submit());

    expect(notifyError).toHaveBeenCalledWith('Contraseña reciente');
    expect(screen.getByLabelText('Nueva contraseña', { exact: false })).toHaveDisplayValue('nueva-clave');
  });
});

describe('ProfileScreen · eliminar cuenta', () => {
  const press = () => fireEvent.press(screen.getByRole('button', { name: 'Eliminar cuenta' }));

  it('pide confirmación y, si se cancela, no borra nada', async () => {
    jest.mocked(confirm).mockResolvedValue(false);
    renderProfile();
    await act(async () => press());

    expect(confirm).toHaveBeenCalledWith(expect.objectContaining({ title: 'Eliminar cuenta' }));
    expect(mockDeleteAccount).not.toHaveBeenCalled();
    expect(mockLogout).not.toHaveBeenCalled();
  });

  it('al confirmar borra la cuenta y cierra la sesión', async () => {
    jest.mocked(confirm).mockResolvedValue(true);
    mockDeleteAccount.mockResolvedValue(undefined);
    mockLogout.mockResolvedValue(undefined);
    renderProfile();
    await act(async () => press());

    await waitFor(() => expect(mockLogout).toHaveBeenCalledTimes(1));
    expect(mockDeleteAccount).toHaveBeenCalledTimes(1);
  });

  it('si el borrado falla avisa con notifyError y no cierra la sesión', async () => {
    jest.mocked(confirm).mockResolvedValue(true);
    mockDeleteAccount.mockRejectedValue(new Error('No se pudo'));
    renderProfile();
    await act(async () => press());

    expect(notifyError).toHaveBeenCalledWith('No se pudo');
    expect(mockLogout).not.toHaveBeenCalled();
  });

  it('si el borrado salió bien y falla el cierre de sesión, no lo reporta como fallo del borrado', async () => {
    jest.mocked(confirm).mockResolvedValue(true);
    mockDeleteAccount.mockResolvedValue(undefined);
    mockLogout.mockRejectedValue(new Error('SecureStore'));
    renderProfile();
    await act(async () => press());

    expect(notifyError).not.toHaveBeenCalled();
    expect(notifyWarning).toHaveBeenCalledWith(expect.stringContaining('se eliminó'));
    // La cuenta ya no existe: el botón queda deshabilitado y sin spinner, no se puede borrar de nuevo.
    expect(screen.getByRole('button', { name: 'Eliminar cuenta', disabled: true })).toBeTruthy();
  });
});

describe('ProfileScreen · doble envío y escritura durante el guardado', () => {
  it('dos toques en el mismo frame sobre "Guardar cambios" mandan un solo PATCH', async () => {
    let finish!: () => void;
    mockUpdateProfile.mockReturnValue(new Promise<void>(resolve => (finish = resolve)));
    renderProfile();
    fireEvent.changeText(screen.getByLabelText('Teléfono', { exact: false }), '456');
    const save = screen.getByRole('button', { name: 'Guardar cambios' });
    fireEvent.press(save);
    fireEvent.press(save);

    expect(mockUpdateProfile).toHaveBeenCalledTimes(1);
    await act(async () => finish());
  });

  it('lo que se escribe mientras se guarda no se pisa con el valor guardado', async () => {
    let finish!: () => void;
    mockUpdateProfile.mockReturnValue(new Promise<void>(resolve => (finish = resolve)));
    renderProfile();
    fireEvent.changeText(screen.getByLabelText('Teléfono', { exact: false }), '456');
    fireEvent.press(screen.getByRole('button', { name: 'Guardar cambios' }));
    fireEvent.changeText(screen.getByLabelText('Teléfono', { exact: false }), '4567');
    await act(async () => finish());

    expect(screen.getByLabelText('Teléfono', { exact: false })).toHaveDisplayValue('4567');
  });

  it('dos envíos seguidos del formulario de contraseña cambian la contraseña una sola vez', async () => {
    let finish!: () => void;
    mockChangePassword.mockReturnValue(new Promise<void>(resolve => (finish = resolve)));
    renderProfile();
    fireEvent.changeText(screen.getByLabelText('Nueva contraseña', { exact: false }), 'nueva-clave');
    fireEvent.changeText(screen.getByLabelText('Confirmar contraseña', { exact: false }), 'nueva-clave');
    fireEvent.press(screen.getByRole('button', { name: 'Cambiar contraseña' }));
    fireEvent(screen.getByLabelText('Confirmar contraseña', { exact: false }), 'submitEditing');

    expect(mockChangePassword).toHaveBeenCalledTimes(1);
    await act(async () => finish());
  });

  it('un error de SWR con datos en pantalla se muestra arriba y el formulario sigue disponible', () => {
    renderProfile({ error: new Error('revalidación fallida') });

    expect(screen.getByText('No se pudo cargar tu perfil')).toBeTruthy();
    expect(screen.getByText('Información personal')).toBeTruthy();
  });
});
