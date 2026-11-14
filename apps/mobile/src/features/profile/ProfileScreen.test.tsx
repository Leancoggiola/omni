import { act, fireEvent, render, screen, userEvent, waitFor } from '@testing-library/react-native';

import { ApiError } from '@omni/shared/api';
import { LocalSessionClearError } from '@/core/auth';
import { confirm, notifyError, notifySuccess, notifyWarning } from '@/shared/ui';
import { getByHostType } from '@/test/hostQueries';

import { ProfileScreen } from './ProfileScreen';

import type { UserProfile } from '@omni/shared/users';

const mockProfile = jest.fn();
const mockUpdateProfile = jest.fn();
const mockUpdatePreferences = jest.fn();
const mockChangePassword = jest.fn();
const mockDeleteAccount = jest.fn();
const mockLogout = jest.fn();
const mockLogoutAll = jest.fn();
const mockClearOverride = jest.fn();
const mockRefresh = jest.fn();
const mockBack = jest.fn();

jest.mock('tamagui', () => jest.requireActual('@/test/tamaguiMock'));
jest.mock('@/core/theme', () => ({
  ...jest.requireActual('@/test/themeMock'),
  useColorSchemeControl: () => ({ colorScheme: 'light', clearOverride: mockClearOverride }),
}));
jest.mock('@/core/auth', () => ({
  LocalSessionClearError: jest.requireActual('@/core/auth/AuthContext').LocalSessionClearError,
  useAuth: () => ({ logout: mockLogout, logoutAll: mockLogoutAll }),
}));
jest.mock('@/core/biometrics', () => ({
  useBiometrics: () => ({ available: false, enabled: false, noun: 'huella', enable: jest.fn(), disable: jest.fn() }),
}));
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
const mockRefreshHousehold = jest.fn();

jest.mock('@/core/household', () => ({ useHousehold: () => ({ mutate: mockRefreshHousehold }) }));
jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: jest.fn() }));
jest.mock('./components/HouseholdCard', () => ({ HouseholdCard: () => null }));
jest.mock('./hooks/useProfile', () => ({ useProfile: () => mockProfile() }));
jest.mock('./hooks/useAccountActions', () => ({
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

async function renderProfile(overrides: Partial<ReturnType<typeof mockProfile>> = {}) {
  mockProfile.mockReturnValue({
    profile: PROFILE,
    error: undefined,
    isLoading: false,
    refresh: mockRefresh,
    updateProfile: mockUpdateProfile,
    updatePreferences: mockUpdatePreferences,
    ...overrides,
  });
  return await render(<ProfileScreen />);
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('ProfileScreen · textos en voseo', () => {
  it('usa voseo en los subtítulos y muestra la tarjeta de foto de perfil', async () => {
    await renderProfile();

    expect(screen.getByText('Gestioná tu información personal y preferencias')).toBeTruthy();
    expect(screen.getByText('Actualizá tus datos personales')).toBeTruthy();
    expect(screen.getByText('Personalizá tu experiencia')).toBeTruthy();
    expect(screen.getByText('Actualizá la contraseña de tu cuenta')).toBeTruthy();
    expect(screen.getByText('Foto de perfil')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Cambiar foto' })).toBeTruthy();
  });
});

describe('ProfileScreen · carga y error', () => {
  it('tirar para actualizar vuelve a pedir el perfil', async () => {
    mockRefresh.mockResolvedValue(undefined);
    await renderProfile();

    await userEvent.setup().pullToRefresh(getByHostType('RCTScrollView'));

    expect(mockRefresh).toHaveBeenCalledTimes(1);
    expect(mockRefreshHousehold).toHaveBeenCalledTimes(1);
  });

  it('muestra el spinner mientras carga, sin formulario', async () => {
    await renderProfile({ profile: null, isLoading: true });

    expect(screen.getByTestId('spinner')).toBeTruthy();
    expect(screen.queryByText('Información personal')).toBeNull();
    expect(screen.getByRole('button', { name: 'Volver a Más' })).toBeTruthy();
  });

  it('un error de SWR sin datos se muestra como ErrorState con Reintentar, no como pantalla vacía', async () => {
    await renderProfile({ profile: null, error: new Error('boom') });

    expect(screen.getByText('No se pudo cargar tu perfil')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it('el botón de volver regresa a la pantalla anterior', async () => {
    await renderProfile();
    await fireEvent.press(screen.getByRole('button', { name: 'Volver a Más' }));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('no ofrece cerrar sesión: vive en Más', async () => {
    await renderProfile();
    expect(screen.queryByRole('button', { name: 'Cerrar sesión' })).toBeNull();
  });
});

describe('ProfileScreen · información personal', () => {
  it('nombre y email van deshabilitados con "No se puede editar" y el teléfono es editable', async () => {
    await renderProfile();

    expect(screen.getAllByText('No se puede editar')).toHaveLength(2);
    expect(screen.getByLabelText('Nombre completo', { exact: false })).toBeDisabled();
    expect(screen.getByLabelText('Email', { exact: false })).toBeDisabled();
    expect(screen.getByLabelText('Teléfono', { exact: false })).toBeEnabled();
  });

  it('"Guardar cambios" está deshabilitado hasta que cambia el teléfono', async () => {
    await renderProfile();
    expect(screen.getByRole('button', { name: 'Guardar cambios', disabled: true })).toBeTruthy();

    await fireEvent.changeText(screen.getByLabelText('Teléfono', { exact: false }), '456');
    expect(screen.getByRole('button', { name: 'Guardar cambios', disabled: false })).toBeTruthy();

    await fireEvent.changeText(screen.getByLabelText('Teléfono', { exact: false }), '123');
    expect(screen.getByRole('button', { name: 'Guardar cambios', disabled: true })).toBeTruthy();
  });

  it('si el perfil trae otro teléfono y el campo no se tocó, el campo lo sigue y el botón queda deshabilitado', async () => {
    const { rerender } = await renderProfile();
    mockProfile.mockReturnValue({ ...mockProfile(), profile: { ...PROFILE, phone: '999' } });
    await rerender(<ProfileScreen />);

    expect(screen.getByLabelText('Teléfono', { exact: false }).props.value).toBe('999');
    expect(screen.getByRole('button', { name: 'Guardar cambios', disabled: true })).toBeTruthy();
  });

  it('si el perfil trae otro teléfono pero el usuario ya estaba escribiendo, no le pisa lo escrito', async () => {
    const { rerender } = await renderProfile();
    await fireEvent.changeText(screen.getByLabelText('Teléfono', { exact: false }), '456');
    mockProfile.mockReturnValue({ ...mockProfile(), profile: { ...PROFILE, phone: '999' } });
    await rerender(<ProfileScreen />);

    expect(screen.getByLabelText('Teléfono', { exact: false }).props.value).toBe('456');
  });

  it('muestra la fecha de nacimiento del perfil en dd/mm/aaaa', async () => {
    await renderProfile({ profile: { ...PROFILE, birthDate: '1990-05-15T00:00:00.000Z' } });

    expect(screen.getByLabelText('Fecha de nacimiento', { exact: false }).props.value).toBe('15/05/1990');
  });

  it('la fecha de nacimiento se enmascara y habilita Guardar solo si es válida', async () => {
    await renderProfile();
    const field = () => screen.getByLabelText('Fecha de nacimiento', { exact: false });

    await fireEvent.changeText(field(), '15051990');
    expect(field().props.value).toBe('15/05/1990');
    expect(screen.getByRole('button', { name: 'Guardar cambios', disabled: false })).toBeTruthy();

    await fireEvent.changeText(field(), '31/02/1990');
    expect(screen.getByText('Ingresá una fecha válida (dd/mm/aaaa)')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Guardar cambios', disabled: true })).toBeTruthy();
  });

  it('guarda la fecha de nacimiento como medianoche UTC y puede borrarla', async () => {
    mockUpdateProfile.mockResolvedValue({});
    await renderProfile({ profile: { ...PROFILE, birthDate: '1990-05-15T00:00:00.000Z' } });
    const field = () => screen.getByLabelText('Fecha de nacimiento', { exact: false });

    await fireEvent.changeText(field(), '16/05/1990');
    await act(async () => await fireEvent.press(screen.getByRole('button', { name: 'Guardar cambios' })));
    expect(mockUpdateProfile).toHaveBeenLastCalledWith({ birthDate: '1990-05-16T00:00:00.000Z' });

    await fireEvent.changeText(field(), '');
    await act(async () => await fireEvent.press(screen.getByRole('button', { name: 'Guardar cambios' })));
    expect(mockUpdateProfile).toHaveBeenLastCalledWith({ birthDate: null });
  });

  it('guarda solo el teléfono (sin birthDate) y avisa con un toast', async () => {
    mockUpdateProfile.mockResolvedValue({});
    await renderProfile();
    await fireEvent.changeText(screen.getByLabelText('Teléfono', { exact: false }), ' 456 ');
    await act(async () => await fireEvent.press(screen.getByRole('button', { name: 'Guardar cambios' })));

    expect(mockUpdateProfile).toHaveBeenCalledWith({ phone: '456' });
    expect(notifySuccess).toHaveBeenCalledWith('Cambios guardados correctamente');
  });

  it('si falla el guardado avisa con notifyError y deja el botón habilitado', async () => {
    mockUpdateProfile.mockRejectedValue(new TypeError('Network request failed'));
    await renderProfile();
    await fireEvent.changeText(screen.getByLabelText('Teléfono', { exact: false }), '456');
    await act(async () => await fireEvent.press(screen.getByRole('button', { name: 'Guardar cambios' })));

    expect(notifyError).toHaveBeenCalledWith('No se pudieron guardar los cambios');
    expect(notifySuccess).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Guardar cambios', disabled: false })).toBeTruthy();
  });
});

describe('ProfileScreen · preferencias', () => {
  it('muestra el valor guardado de notificaciones y tema', async () => {
    await renderProfile();

    expect(screen.getByRole('switch', { name: 'Notificaciones' })).toHaveProp('accessibilityState', {
      checked: false,
      disabled: false,
    });
    expect(screen.getByRole('radio', { name: 'Claro', checked: true })).toBeTruthy();
  });

  it('guardan al instante: notificaciones manda solo ese campo', async () => {
    mockUpdatePreferences.mockResolvedValue({});
    await renderProfile();
    await act(async () => await fireEvent.press(screen.getByRole('switch', { name: 'Notificaciones' })));

    expect(mockUpdatePreferences).toHaveBeenCalledWith({ notifications: true });
    expect(mockClearOverride).not.toHaveBeenCalled();
  });

  it('cambiar el tema lo guarda y descarta el override de la sesión', async () => {
    mockUpdatePreferences.mockResolvedValue({});
    await renderProfile();
    await act(async () => await fireEvent.press(screen.getByRole('radio', { name: 'Sistema' })));

    expect(mockUpdatePreferences).toHaveBeenCalledWith({ theme: 'auto' });
    expect(mockClearOverride).toHaveBeenCalledTimes(1);
  });

  it('muestra el valor nuevo enseguida y, si el PATCH falla, vuelve al anterior con notifyError', async () => {
    let fail!: (error: Error) => void;
    mockUpdatePreferences.mockReturnValue(new Promise((_, reject) => (fail = reject)));
    await renderProfile();
    await fireEvent.press(screen.getByRole('radio', { name: 'Oscuro' }));

    expect(screen.getByRole('radio', { name: 'Oscuro', checked: true })).toBeTruthy();

    await act(async () => fail(new TypeError('Network request failed')));

    expect(screen.getByRole('radio', { name: 'Claro', checked: true })).toBeTruthy();
    expect(notifyError).toHaveBeenCalledWith('No se pudo guardar la preferencia');
    expect(mockClearOverride).not.toHaveBeenCalled();
  });

  it('ignora un segundo cambio de tema mientras el primero está en vuelo', async () => {
    let finish!: () => void;
    mockUpdatePreferences.mockReturnValue(new Promise<void>(resolve => (finish = resolve)));
    await renderProfile();
    await fireEvent.press(screen.getByRole('radio', { name: 'Oscuro' }));
    await fireEvent.press(screen.getByRole('radio', { name: 'Sistema' }));

    expect(mockUpdatePreferences).toHaveBeenCalledTimes(1);
    await act(async () => finish());
  });
});

describe('ProfileScreen · cambiar contraseña', () => {
  const submit = async () => await fireEvent.press(screen.getByRole('button', { name: 'Cambiar contraseña' }));
  const field = (label: string) => screen.getByLabelText(label, { exact: false });
  const fill = async (current: string, next: string, confirmation = next) => {
    await fireEvent.changeText(field('Contraseña actual'), current);
    await fireEvent.changeText(field('Nueva contraseña'), next);
    await fireEvent.changeText(field('Confirmar contraseña'), confirmation);
  };

  it('pide la contraseña actual, la nueva y la confirmación', async () => {
    await renderProfile();

    expect(field('Contraseña actual')).toBeTruthy();
    expect(field('Nueva contraseña')).toBeTruthy();
    expect(field('Confirmar contraseña')).toBeTruthy();
  });

  it('el botón está deshabilitado hasta que se escribe algo', async () => {
    await renderProfile();
    expect(screen.getByRole('button', { name: 'Cambiar contraseña', disabled: true })).toBeTruthy();

    await fireEvent.changeText(field('Contraseña actual'), 'a');
    expect(screen.getByRole('button', { name: 'Cambiar contraseña', disabled: false })).toBeTruthy();
  });

  it('valida al enviar: sin actual, contraseña corta y confirmación distinta, sin llamar a la API', async () => {
    await renderProfile();
    await fill('', '1234', '12345678');
    await submit();

    expect(screen.getByText('La contraseña actual es requerida')).toBeTruthy();
    expect(screen.getByText('La contraseña debe tener al menos 8 caracteres')).toBeTruthy();
    expect(screen.getByText('Las contraseñas no coinciden')).toBeTruthy();
    expect(mockChangePassword).not.toHaveBeenCalled();
  });

  it('con datos válidos cambia la contraseña, limpia los campos y avisa', async () => {
    mockChangePassword.mockResolvedValue(undefined);
    await renderProfile();
    await fill('clave-actual', 'nueva-clave');
    await act(async () => await submit());

    expect(mockChangePassword).toHaveBeenCalledWith({ currentPassword: 'clave-actual', newPassword: 'nueva-clave' });
    expect(notifySuccess).toHaveBeenCalledWith('Contraseña actualizada correctamente');
    expect(field('Contraseña actual')).toHaveDisplayValue('');
    expect(field('Nueva contraseña')).toHaveDisplayValue('');
  });

  it('si el servidor rechaza la contraseña actual, avisa con notifyError y conserva lo escrito', async () => {
    mockChangePassword.mockRejectedValue(new ApiError('La contraseña actual es incorrecta', 400));
    await renderProfile();
    await fill('equivocada', 'nueva-clave');
    await act(async () => await submit());

    expect(notifyError).toHaveBeenCalledWith('La contraseña actual es incorrecta');
    expect(field('Contraseña actual')).toHaveDisplayValue('equivocada');
    expect(field('Nueva contraseña')).toHaveDisplayValue('nueva-clave');
  });
});

describe('ProfileScreen · eliminar cuenta', () => {
  const press = async () => await fireEvent.press(screen.getByRole('button', { name: 'Eliminar cuenta' }));

  it('pide confirmación y, si se cancela, no borra nada', async () => {
    jest.mocked(confirm).mockResolvedValue(false);
    await renderProfile();
    await act(async () => await press());

    expect(confirm).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Eliminar cuenta',
        description: expect.stringContaining('¿Seguro que querés eliminar'),
      })
    );
    expect(mockDeleteAccount).not.toHaveBeenCalled();
    expect(mockLogout).not.toHaveBeenCalled();
  });

  it('al confirmar borra la cuenta y cierra la sesión', async () => {
    jest.mocked(confirm).mockResolvedValue(true);
    mockDeleteAccount.mockResolvedValue(undefined);
    mockLogout.mockResolvedValue(undefined);
    await renderProfile();
    await act(async () => await press());

    await waitFor(() => expect(mockLogout).toHaveBeenCalledTimes(1));
    expect(mockDeleteAccount).toHaveBeenCalledTimes(1);
  });

  it('si el borrado falla avisa con notifyError y no cierra la sesión', async () => {
    jest.mocked(confirm).mockResolvedValue(true);
    mockDeleteAccount.mockRejectedValue(new ApiError('No se pudo', 503));
    await renderProfile();
    await act(async () => await press());

    expect(notifyError).toHaveBeenCalledWith('No se pudo');
    expect(mockLogout).not.toHaveBeenCalled();
  });

  it('si el borrado salió bien y falla el cierre de sesión, no lo reporta como fallo del borrado', async () => {
    jest.mocked(confirm).mockResolvedValue(true);
    mockDeleteAccount.mockResolvedValue(undefined);
    mockLogout.mockRejectedValue(new Error('SecureStore'));
    await renderProfile();
    await act(async () => await press());

    expect(notifyError).not.toHaveBeenCalled();
    expect(notifyWarning).toHaveBeenCalledWith(expect.stringContaining('se eliminó'));
    expect(screen.getByRole('button', { name: 'Eliminar cuenta', disabled: true })).toBeTruthy();
  });
});

describe('ProfileScreen · cerrar sesión en todos los dispositivos', () => {
  const press = async () =>
    await fireEvent.press(screen.getByRole('button', { name: 'Cerrar sesión en todos los dispositivos' }));

  it('pide confirmación y, si se cancela, no cierra nada', async () => {
    jest.mocked(confirm).mockResolvedValue(false);
    await renderProfile();
    await act(async () => await press());

    expect(confirm).toHaveBeenCalledWith(expect.objectContaining({ title: 'Cerrar sesión en todos los dispositivos' }));
    expect(mockLogoutAll).not.toHaveBeenCalled();
  });

  it('al confirmar cierra todas las sesiones', async () => {
    jest.mocked(confirm).mockResolvedValue(true);
    mockLogoutAll.mockResolvedValue(undefined);
    await renderProfile();
    await act(async () => await press());

    expect(mockLogoutAll).toHaveBeenCalledTimes(1);
    expect(notifyError).not.toHaveBeenCalled();
  });

  it('si la API falla avisa con notifyError', async () => {
    jest.mocked(confirm).mockResolvedValue(true);
    mockLogoutAll.mockRejectedValue(new ApiError('No se pudo', 503));
    await renderProfile();
    await act(async () => await press());

    expect(notifyError).toHaveBeenCalledWith('No se pudo');
  });

  it('si la API cerró las sesiones y falla el borrado local avisa sin reportarlo como error', async () => {
    jest.mocked(confirm).mockResolvedValue(true);
    mockLogoutAll.mockRejectedValue(new LocalSessionClearError(new Error('SecureStore')));
    await renderProfile();
    await act(async () => await press());

    expect(notifyError).not.toHaveBeenCalled();
    expect(notifyWarning).toHaveBeenCalledWith(expect.stringContaining('Se cerraron las sesiones'));
  });

  it('dos toques seguidos piden una sola confirmación', async () => {
    let answer!: (value: boolean) => void;
    jest.mocked(confirm).mockReturnValue(new Promise<boolean>(resolve => (answer = resolve)));
    await renderProfile();
    await act(async () => {
      await press();
      await press();
    });
    await act(async () => answer(false));

    expect(confirm).toHaveBeenCalledTimes(1);
  });
});

describe('ProfileScreen · doble envío y escritura durante el guardado', () => {
  it('dos toques en el mismo frame sobre "Guardar cambios" mandan un solo PATCH', async () => {
    let finish!: () => void;
    mockUpdateProfile.mockReturnValue(new Promise<void>(resolve => (finish = resolve)));
    await renderProfile();
    await fireEvent.changeText(screen.getByLabelText('Teléfono', { exact: false }), '456');
    const save = screen.getByRole('button', { name: 'Guardar cambios' });
    await fireEvent.press(save);
    await fireEvent.press(save);

    expect(mockUpdateProfile).toHaveBeenCalledTimes(1);
    await act(async () => finish());
  });

  it('lo que se escribe mientras se guarda no se pisa con el valor guardado', async () => {
    let finish!: () => void;
    mockUpdateProfile.mockReturnValue(new Promise<void>(resolve => (finish = resolve)));
    await renderProfile();
    await fireEvent.changeText(screen.getByLabelText('Teléfono', { exact: false }), '456');
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar cambios' }));
    await fireEvent.changeText(screen.getByLabelText('Teléfono', { exact: false }), '4567');
    await act(async () => finish());

    expect(screen.getByLabelText('Teléfono', { exact: false })).toHaveDisplayValue('4567');
  });

  it('dos envíos seguidos del formulario de contraseña cambian la contraseña una sola vez', async () => {
    let finish!: () => void;
    mockChangePassword.mockReturnValue(new Promise<void>(resolve => (finish = resolve)));
    await renderProfile();
    await fireEvent.changeText(screen.getByLabelText('Contraseña actual', { exact: false }), 'clave-actual');
    await fireEvent.changeText(screen.getByLabelText('Nueva contraseña', { exact: false }), 'nueva-clave');
    await fireEvent.changeText(screen.getByLabelText('Confirmar contraseña', { exact: false }), 'nueva-clave');
    await fireEvent.press(screen.getByRole('button', { name: 'Cambiar contraseña' }));
    await fireEvent(screen.getByLabelText('Confirmar contraseña', { exact: false }), 'submitEditing');

    expect(mockChangePassword).toHaveBeenCalledTimes(1);
    await act(async () => finish());
  });

  it('un error de SWR con datos en pantalla se muestra arriba y el formulario sigue disponible', async () => {
    await renderProfile({ error: new Error('revalidación fallida') });

    expect(screen.getByText('No se pudo cargar tu perfil')).toBeTruthy();
    expect(screen.getByText('Información personal')).toBeTruthy();
  });
});
