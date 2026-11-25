import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { confirm, notifyError, notifySuccess, SHEET_EXIT_MS } from '@/shared/ui';

import { friend } from './fixtures';
import { FriendsScreen } from './FriendsScreen';

import type { ReactNode } from 'react';

jest.mock('tamagui', () => jest.requireActual('@/test/tamaguiMock'));
jest.mock('@/core/theme', () => jest.requireActual('@/test/themeMock'));
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default
);
jest.mock('@/core/biometrics', () => ({ SensitiveGate: ({ children }: { children: ReactNode }) => children }));
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), canGoBack: () => true, replace: jest.fn() }),
}));
jest.mock('@/shared/ui', () => ({
  ...jest.requireActual('@/shared/ui'),
  confirm: jest.fn(),
}));
jest.mock('@/shared/ui/notify/notify', () => ({
  ...jest.requireActual('@/shared/ui/notify/notify'),
  notifyError: jest.fn(),
  notifySuccess: jest.fn(),
}));

const mockUseSplitFriends = jest.fn();
jest.mock('./hooks/useSplitFriends', () => ({ useSplitFriends: () => mockUseSplitFriends() }));
const mockMutations = { createFriend: jest.fn(), updateFriend: jest.fn(), deleteFriend: jest.fn() };
jest.mock('./hooks/useSplitExpensesMutations', () => ({ useSplitExpensesMutations: () => mockMutations }));

const friends = (overrides: object = {}) => ({
  friends: [friend(), friend({ id: 'f2', name: 'Camila', balance: -12500 })],
  isLoading: false,
  error: undefined,
  mutate: jest.fn(),
  ...overrides,
});

const type = (label: string, value: string) => fireEvent.changeText(screen.getByLabelText(label), value);
const closeSheet = () =>
  act(async () => {
    await jest.advanceTimersByTimeAsync(SHEET_EXIT_MS);
  });

beforeEach(() => {
  jest.clearAllMocks();
  mockUseSplitFriends.mockReturnValue(friends());
  mockMutations.createFriend.mockResolvedValue(undefined);
  mockMutations.updateFriend.mockResolvedValue(undefined);
  mockMutations.deleteFriend.mockResolvedValue(undefined);
  jest.mocked(confirm).mockResolvedValue(true);
});

afterEach(() => jest.useRealTimers());

describe('FriendsScreen', () => {
  it('lista los amigos con su saldo', async () => {
    await render(<FriendsScreen />);

    expect(screen.getByText('Le deben $750,00')).toBeTruthy();
    expect(screen.getByText('Debe $12.500,00')).toBeTruthy();
  });

  it.each([
    ['cargando', { friends: undefined, isLoading: true }, null],
    ['con error', { friends: undefined, error: new Error('x') }, 'No se pudieron cargar los amigos'],
    ['vacío', { friends: [] }, 'Sin amigos guardados'],
  ])('muestra el estado %s', async (_state, overrides, text) => {
    mockUseSplitFriends.mockReturnValue(friends(overrides));
    await render(<FriendsScreen />);

    expect(text ? screen.getByText(text) : screen.getByLabelText('Cargando')).toBeTruthy();
  });

  it('agrega un amigo con nombre y alias, y limpia el formulario', async () => {
    await render(<FriendsScreen />);

    await type('Nombre, obligatorio', ' Nico ');
    await type('Alias, obligatorio', 'nico.paz');
    await fireEvent.press(screen.getByRole('button', { name: 'Agregar' }));

    expect(mockMutations.createFriend).toHaveBeenCalledWith({ name: 'Nico', alias: 'nico.paz' });
    expect(notifySuccess).toHaveBeenCalledWith('Amigo guardado');
    expect(screen.getByLabelText('Nombre, obligatorio').props.value).toBe('');
  });

  it('valida el alias antes de enviar', async () => {
    await render(<FriendsScreen />);

    await type('Nombre, obligatorio', 'Nico');
    await type('Alias, obligatorio', 'nico');
    await fireEvent.press(screen.getByRole('button', { name: 'Agregar' }));

    expect(screen.getByText('El alias debe tener al menos 6 caracteres')).toBeTruthy();
    expect(mockMutations.createFriend).not.toHaveBeenCalled();
  });

  it('un error al agregar queda sobre el formulario', async () => {
    mockMutations.createFriend.mockRejectedValue(new Error('x'));
    await render(<FriendsScreen />);

    await type('Nombre, obligatorio', 'Nico');
    await type('Alias, obligatorio', 'nico.paz');
    await fireEvent.press(screen.getByRole('button', { name: 'Agregar' }));

    expect(screen.getByText('No se pudo guardar el amigo')).toBeTruthy();
  });

  it('edita desde la hoja, con Guardar deshabilitado hasta que haya cambios', async () => {
    jest.useFakeTimers();
    await render(<FriendsScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Editar a Martín' }));
    expect(screen.getByRole('button', { name: 'Guardar cambios', disabled: true })).toBeTruthy();
    await fireEvent.changeText(screen.getAllByLabelText('Alias, obligatorio')[1]!, 'martincho');
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar cambios' }));
    await closeSheet();

    expect(mockMutations.updateFriend).toHaveBeenCalledWith('f1', { name: 'Martín', alias: 'martincho' });
    expect(notifySuccess).toHaveBeenCalledWith('Amigo actualizado');
  });

  it('elimina con confirmación una vez cerrada la hoja', async () => {
    jest.useFakeTimers();
    await render(<FriendsScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Editar a Martín' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Eliminar amigo' }));
    expect(confirm).not.toHaveBeenCalled();
    await closeSheet();

    expect(confirm).toHaveBeenCalledWith({
      title: 'Eliminar amigo',
      description: '¿Seguro que querés eliminar a "Martín"?',
      confirmLabel: 'Eliminar',
    });
    expect(mockMutations.deleteFriend).toHaveBeenCalledWith('f1');
    expect(notifySuccess).toHaveBeenCalledWith('Amigo eliminado');
  });

  it('si el borrado falla avisa', async () => {
    jest.useFakeTimers();
    mockMutations.deleteFriend.mockRejectedValue(new Error('x'));
    await render(<FriendsScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Editar a Martín' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Eliminar amigo' }));
    await closeSheet();

    expect(notifyError).toHaveBeenCalledWith('No se pudo eliminar el amigo');
  });
});
