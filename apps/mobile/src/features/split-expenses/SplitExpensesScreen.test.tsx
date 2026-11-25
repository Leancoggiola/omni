import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { BackHandler } from 'react-native';

import { notifySuccess, SHEET_EXIT_MS } from '@/shared/ui';

import { friend, gatheringDetail, gatheringSummary } from './fixtures';
import { SplitExpensesScreen } from './SplitExpensesScreen';

import type { ReactNode } from 'react';

jest.mock('tamagui', () => jest.requireActual('@/test/tamaguiMock'));
jest.mock('@/core/theme', () => jest.requireActual('@/test/themeMock'));
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default
);
jest.mock('@/core/biometrics', () => ({ SensitiveGate: ({ children }: { children: ReactNode }) => children }));
jest.mock('@/core/auth', () => ({ useAuth: () => ({ user: { name: 'Ana Gómez' } }) }));
const mockRouter = { push: jest.fn(), navigate: jest.fn() };
jest.mock('expo-router', () => ({ useRouter: () => mockRouter }));
jest.mock('expo-router/react-navigation', () => ({ useIsFocused: () => true }));
jest.mock('@/shared/ui', () => ({ ...jest.requireActual('@/shared/ui'), notifySuccess: jest.fn() }));

const mockUseGatherings = jest.fn();
jest.mock('./hooks/useGatherings', () => ({ useGatherings: () => mockUseGatherings() }));
const mockUseSplitBalance = jest.fn();
jest.mock('./hooks/useSplitBalance', () => ({ useSplitBalance: () => mockUseSplitBalance() }));
const mockUseSplitFriends = jest.fn();
jest.mock('./hooks/useSplitFriends', () => ({ useSplitFriends: () => mockUseSplitFriends() }));
const mockCreateGathering = jest.fn();
jest.mock('./hooks/useSplitExpensesMutations', () => ({
  useSplitExpensesMutations: () => ({ createGathering: mockCreateGathering }),
}));

const ITEMS = [
  gatheringSummary(),
  gatheringSummary({ id: 'g2', name: 'Cumple de Sofi', isSettled: true, myBalance: 0, lastExpense: null }),
];

const list = (overrides: object = {}) => ({
  gatherings: ITEMS,
  isLoading: false,
  error: undefined,
  mutate: jest.fn(),
  ...overrides,
});

const openSheet = async () => {
  await render(<SplitExpensesScreen />);
  await fireEvent.press(screen.getByRole('button', { name: 'Nueva juntada' }));
};
const create = () => fireEvent.press(screen.getByRole('button', { name: 'Crear juntada' }));
const typeName = (name: string) => fireEvent.changeText(screen.getByLabelText('Nombre, obligatorio'), name);

beforeEach(() => {
  jest.clearAllMocks();
  mockUseGatherings.mockReturnValue(list());
  mockUseSplitBalance.mockReturnValue({
    balance: { owedToYou: 33750, youOwe: 12500, net: 21250, gatheringCount: 2 },
    error: undefined,
    mutate: jest.fn(),
  });
  mockUseSplitFriends.mockReturnValue({ friends: [friend()], isLoading: false, error: undefined, mutate: jest.fn() });
  mockCreateGathering.mockResolvedValue(gatheringDetail({ id: 'nueva' }));
});

afterEach(() => jest.useRealTimers());

describe('SplitExpensesScreen', () => {
  it('muestra el saldo total, las juntadas por estado y el último gasto', async () => {
    await render(<SplitExpensesScreen />);

    expect(screen.getByText('Te deben $33.750,00 · debés $12.500,00')).toBeTruthy();
    expect(screen.getByText('Activas')).toBeTruthy();
    expect(screen.getByText('Saldadas')).toBeTruthy();
    expect(screen.getByText('Martín: Bebidas · $27.000,00')).toBeTruthy();
    expect(screen.getAllByText('18/10 · 4 personas · $96.000,00')).toHaveLength(2);
    expect(screen.getByRole('button', { name: /^Cumple de Sofi, .*Saldada$/ })).toBeTruthy();
  });

  it('abre una juntada y Amigos', async () => {
    await render(<SplitExpensesScreen />);

    await fireEvent.press(screen.getByRole('button', { name: /^Asado del sábado/ }));
    await fireEvent.press(screen.getByRole('button', { name: 'Amigos' }));

    expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/split-expenses/[id]', params: { id: 'g1' } });
    expect(mockRouter.push).toHaveBeenCalledWith('/split-expenses/friends');
  });

  it('mientras carga muestra el skeleton', async () => {
    mockUseGatherings.mockReturnValue(list({ gatherings: undefined, isLoading: true }));
    await render(<SplitExpensesScreen />);

    expect(screen.getByLabelText('Cargando')).toBeTruthy();
  });

  it('el error no se muestra como lista vacía', async () => {
    mockUseGatherings.mockReturnValue(list({ gatherings: undefined, error: new Error('x') }));
    await render(<SplitExpensesScreen />);

    expect(screen.getByText('No se pudieron cargar tus juntadas')).toBeTruthy();
    expect(screen.queryByText('Todavía no tenés juntadas')).toBeNull();
  });

  it('sin juntadas invita a crear la primera', async () => {
    mockUseGatherings.mockReturnValue(list({ gatherings: [] }));
    await render(<SplitExpensesScreen />);

    expect(screen.getByText('Todavía no tenés juntadas')).toBeTruthy();
  });

  it('si el saldo falla lo dice en la cabecera', async () => {
    mockUseSplitBalance.mockReturnValue({ balance: undefined, error: new Error('x'), mutate: jest.fn() });
    await render(<SplitExpensesScreen />);

    expect(screen.getByText('No se pudo cargar tu saldo')).toBeTruthy();
  });

  it('Atrás de Android vuelve a "Más"', async () => {
    const listener = jest.spyOn(BackHandler, 'addEventListener');
    await render(<SplitExpensesScreen />);

    const handler = listener.mock.calls.at(-1)?.[1];
    expect(handler?.({} as never)).toBe(true);
    expect(mockRouter.navigate).toHaveBeenCalledWith('/more');
  });

  describe('nueva juntada', () => {
    it('crea con amigos y nombres sueltos, y abre la juntada al cerrar la hoja', async () => {
      jest.useFakeTimers({ now: new Date('2026-10-18T15:00:00.000Z') });
      await openSheet();

      await typeName('  Cena ');
      await fireEvent.press(screen.getByRole('button', { name: 'Martín' }));
      await fireEvent.press(screen.getByRole('button', { name: 'Amigo nuevo' }));
      await fireEvent.changeText(screen.getByLabelText('Nombre del participante'), 'Lucas');
      await fireEvent.press(screen.getByRole('button', { name: 'Agregar participante' }));
      expect(screen.getByText('3 personas')).toBeTruthy();
      await create();
      await act(async () => {
        await jest.advanceTimersByTimeAsync(SHEET_EXIT_MS);
      });

      expect(mockCreateGathering).toHaveBeenCalledWith({
        name: 'Cena',
        date: '2026-10-18',
        participants: [{ friendId: 'f1' }, { name: 'Lucas' }],
      });
      expect(notifySuccess).toHaveBeenCalledWith('Juntada creada');
      expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/split-expenses/[id]', params: { id: 'nueva' } });
    });

    it('quitar un participante y no repetir nombres', async () => {
      await openSheet();

      for (const name of ['Lucas', 'lucas']) {
        await fireEvent.press(screen.getByRole('button', { name: 'Amigo nuevo' }));
        await fireEvent.changeText(screen.getByLabelText('Nombre del participante'), name);
        await fireEvent.press(screen.getByRole('button', { name: 'Agregar participante' }));
      }
      expect(screen.getByText('2 personas')).toBeTruthy();

      await fireEvent.press(screen.getByRole('button', { name: 'Quitar Lucas' }));
      expect(screen.getByText('1 persona')).toBeTruthy();
    });

    it('valida el nombre y los participantes al enviar', async () => {
      await openSheet();

      await fireEvent.press(screen.getByRole('button', { name: 'Ayer' }));
      await create();

      expect(screen.getByText('Ingresá un nombre')).toBeTruthy();
      expect(screen.getByText('Agregá al menos un participante')).toBeTruthy();
      expect(mockCreateGathering).not.toHaveBeenCalled();
    });

    it('"Otra" pide el día y no admite una fecha futura', async () => {
      await openSheet();

      await typeName('Cena');
      await fireEvent.press(screen.getByRole('button', { name: 'Martín' }));
      await fireEvent.press(screen.getByRole('button', { name: 'Otra' }));
      await fireEvent.changeText(screen.getByLabelText('Día de la juntada'), '31122199');
      await create();
      expect(screen.getByText('La fecha no puede ser futura')).toBeTruthy();

      await fireEvent.changeText(screen.getByLabelText('Día de la juntada'), '05012026');
      await create();
      expect(mockCreateGathering).toHaveBeenCalledWith(expect.objectContaining({ date: '2026-01-05' }));
    });

    it('un error de la API queda en la hoja', async () => {
      mockCreateGathering.mockRejectedValue(new Error('x'));
      await openSheet();

      await typeName('Cena');
      await fireEvent.press(screen.getByRole('button', { name: 'Martín' }));
      await create();

      expect(screen.getByText('No se pudo crear la juntada')).toBeTruthy();
    });

    it('si los amigos no cargan lo dice con reintento', async () => {
      mockUseSplitFriends.mockReturnValue({
        friends: undefined,
        isLoading: false,
        error: new Error('x'),
        mutate: jest.fn(),
      });
      await openSheet();

      expect(screen.getByText('No se pudieron cargar tus amigos')).toBeTruthy();
    });
  });
});
