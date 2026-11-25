import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Share } from 'react-native';

import { actionSheet, confirm, notifyError, notifySuccess, SHEET_EXIT_MS } from '@/shared/ui';

import { expense, gatheringDetail, participant } from './fixtures';
import { GatheringScreen } from './GatheringScreen';

import type { ReactNode } from 'react';

jest.mock('tamagui', () => jest.requireActual('@/test/tamaguiMock'));
jest.mock('@/core/theme', () => jest.requireActual('@/test/themeMock'));
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default
);
jest.mock('@/core/biometrics', () => ({ SensitiveGate: ({ children }: { children: ReactNode }) => children }));
jest.mock('expo-router/react-navigation', () => ({ useIsFocused: () => true }));
const mockSetOffset = jest.fn();
jest.mock('@/shared/ui/notify/NotificationsProvider', () => ({
  ...jest.requireActual('@/shared/ui/notify/NotificationsProvider'),
  useSetNotificationsBottomOffset: () => mockSetOffset,
}));
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, canGoBack: () => true, replace: jest.fn() }),
  useLocalSearchParams: () => ({ id: 'g1' }),
}));
jest.mock('@/shared/ui', () => ({
  ...jest.requireActual('@/shared/ui'),
  actionSheet: jest.fn(),
  confirm: jest.fn(),
}));
jest.mock('@/shared/ui/notify/notify', () => ({
  ...jest.requireActual('@/shared/ui/notify/notify'),
  notifyError: jest.fn(),
  notifySuccess: jest.fn(),
}));

const mockUseGathering = jest.fn();
jest.mock('./hooks/useGathering', () => ({ useGathering: () => mockUseGathering() }));
const mockMutations = {
  addExpense: jest.fn(),
  deleteExpense: jest.fn(),
  setGatheringSettled: jest.fn(),
  deleteGathering: jest.fn(),
};
jest.mock('./hooks/useSplitExpensesMutations', () => ({ useSplitExpensesMutations: () => mockMutations }));

const mockActionSheet = jest.mocked(actionSheet);
const mockConfirm = jest.mocked(confirm);

const loaded = (gathering = gatheringDetail()) => ({
  gathering,
  isLoading: false,
  error: undefined,
  mutate: jest.fn(),
});

const quickInput = () => screen.getByLabelText('Monto y detalle');
const submitQuick = async (text: string) => {
  await fireEvent.changeText(quickInput(), text);
  await fireEvent(quickInput(), 'submitEditing');
};
const closeSheet = () =>
  act(async () => {
    await jest.advanceTimersByTimeAsync(SHEET_EXIT_MS);
  });

beforeEach(() => {
  jest.clearAllMocks();
  mockUseGathering.mockReturnValue(loaded());
  mockMutations.addExpense.mockResolvedValue(undefined);
  mockMutations.deleteExpense.mockResolvedValue(undefined);
  mockMutations.setGatheringSettled.mockResolvedValue(undefined);
  mockMutations.deleteGathering.mockResolvedValue(undefined);
  mockConfirm.mockResolvedValue(true);
});

afterEach(() => jest.useRealTimers());

describe('GatheringScreen', () => {
  it('muestra el feed con quién pagó, el detalle y el importe', async () => {
    await render(<GatheringScreen />);

    expect(screen.getByText('Asado del sábado')).toBeTruthy();
    expect(screen.getByText('2 personas · $27.000,00')).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Martín, Bebidas, \$27\.000,00/ })).toBeTruthy();
    expect(screen.getByText('1 transferencia · $13.500,00')).toBeTruthy();
  });

  it('les pasa a las notificaciones el alto del pie, para que no lo tapen', async () => {
    const { unmount } = await render(<GatheringScreen />);

    await fireEvent(screen.getByTestId('bottom-panel'), 'layout', { nativeEvent: { layout: { height: 150 } } });
    expect(mockSetOffset).toHaveBeenLastCalledWith(150);

    await unmount();
    expect(mockSetOffset).toHaveBeenLastCalledWith(0);
  });

  it('un gasto parcial dice entre quiénes y cuánto es cada parte', async () => {
    mockUseGathering.mockReturnValue(loaded(gatheringDetail({ expenses: [expense({ sharedWith: ['p0'] })] })));
    await render(<GatheringScreen />);

    expect(screen.getByText('Entre vos · $27.000,00 c/u')).toBeTruthy();
  });

  it('mientras carga muestra el skeleton', async () => {
    mockUseGathering.mockReturnValue({ gathering: undefined, isLoading: true, error: undefined, mutate: jest.fn() });
    await render(<GatheringScreen />);

    expect(screen.getByLabelText('Cargando')).toBeTruthy();
  });

  it('el error se muestra con reintento', async () => {
    const mutate = jest.fn();
    mockUseGathering.mockReturnValue({ gathering: undefined, isLoading: false, error: new Error('x'), mutate });
    await render(<GatheringScreen />);

    expect(screen.getByText('No se pudo cargar la juntada')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));
    expect(mutate).toHaveBeenCalled();
  });

  it('recién creada invita a cargar el primer gasto, sin la fila de saldar', async () => {
    mockUseGathering.mockReturnValue(loaded(gatheringDetail({ expenses: [], settlements: [], totalAmount: 0 })));
    await render(<GatheringScreen />);

    expect(screen.getByText('Creaste la juntada con Martín')).toBeTruthy();
    expect(screen.getByText('Todavía no hay gastos')).toBeTruthy();
    expect(screen.queryByText('Saldar cuentas')).toBeNull();
    expect(quickInput()).toBeTruthy();
  });

  it('con una sola persona avisa y no deja cargar gastos', async () => {
    mockUseGathering.mockReturnValue(
      loaded(
        gatheringDetail({
          participants: [participant({ isSelf: true })],
          participantCount: 1,
          expenses: [],
          settlements: [],
        })
      )
    );
    await render(<GatheringScreen />);

    expect(screen.getByText(/^Falta gente para dividir/)).toBeTruthy();
    expect(screen.getByText('Esta juntada no tiene gastos')).toBeTruthy();
    expect(screen.queryByLabelText('Monto y detalle')).toBeNull();
  });

  describe('carga rápida', () => {
    it('agrega el gasto entre todos, pagado por vos, y limpia el campo', async () => {
      await render(<GatheringScreen />);

      await submitQuick('9000 Hielo');

      expect(mockMutations.addExpense).toHaveBeenCalledWith('g1', {
        participantId: 'p0',
        amount: 9000,
        description: 'Hielo',
      });
      expect(quickInput().props.value).toBe('');
    });

    it('sin un monto adelante explica cómo escribirlo y no llama a la API', async () => {
      await render(<GatheringScreen />);

      await submitQuick('Hielo');

      expect(notifyError).toHaveBeenCalledWith('Empezá con el monto: por ejemplo, 27000 Bebidas');
      expect(mockMutations.addExpense).not.toHaveBeenCalled();
    });

    it('si falla avisa y no borra lo escrito', async () => {
      mockMutations.addExpense.mockRejectedValue(new Error('x'));
      await render(<GatheringScreen />);

      await submitQuick('9000 Hielo');

      expect(notifyError).toHaveBeenCalledWith('No se pudo agregar el gasto');
      expect(quickInput().props.value).toBe('9000 Hielo');
    });

    it('permite elegir quién pagó', async () => {
      mockActionSheet.mockResolvedValue('p1');
      await render(<GatheringScreen />);

      await fireEvent.press(screen.getByRole('button', { name: 'Pagó Vos. Elegir quién pagó' }));
      await submitQuick('10');

      expect(mockMutations.addExpense).toHaveBeenCalledWith('g1', expect.objectContaining({ participantId: 'p1' }));
    });
  });

  describe('hoja de nuevo gasto', () => {
    const openSheet = async (text = '') => {
      await render(<GatheringScreen />);
      if (text) await fireEvent.changeText(quickInput(), text);
      await fireEvent.press(screen.getByRole('button', { name: 'Agregar gasto con más detalle' }));
    };

    it('se abre con lo escrito en la carga rápida y la línea del reparto', async () => {
      await openSheet('27000 Bebidas');

      expect(screen.getByLabelText('Monto').props.value).toBe('27000');
      expect(screen.getByLabelText('Detalle').props.value).toBe('Bebidas');
      expect(screen.getByText('Se divide entre 2 de 2 · $13.500,00 c/u')).toBeTruthy();
    });

    it('sin sharedWith cuando se divide entre todos', async () => {
      await openSheet('100');

      await fireEvent.press(screen.getByRole('button', { name: 'Agregar gasto' }));

      expect(mockMutations.addExpense).toHaveBeenCalledWith('g1', {
        participantId: 'p0',
        amount: 100,
        description: null,
        sharedWith: undefined,
      });
    });

    it('manda solo a los elegidos', async () => {
      await openSheet('100');

      await fireEvent.press(screen.getByRole('button', { name: 'Dividir con Martín' }));
      expect(screen.getByText('Se divide entre 1 de 2 · $100,00 c/u')).toBeTruthy();
      await fireEvent.press(screen.getByRole('button', { name: 'Agregar gasto' }));

      expect(mockMutations.addExpense).toHaveBeenCalledWith('g1', expect.objectContaining({ sharedWith: ['p0'] }));
    });

    it('sin nadie elegido muestra el error y no deja agregar', async () => {
      await openSheet('100');

      await fireEvent.press(screen.getByRole('button', { name: 'Dividir con Martín' }));
      await fireEvent.press(screen.getByRole('button', { name: 'Dividir con Vos' }));

      expect(screen.getByText('Elegí al menos una persona')).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Agregar gasto', disabled: true })).toBeTruthy();
    });

    it('un monto inválido se marca en el campo', async () => {
      await openSheet();

      await fireEvent.changeText(screen.getByLabelText('Monto'), '0');
      await fireEvent.press(screen.getByRole('button', { name: 'Agregar gasto' }));

      expect(screen.getByText('Ingresá un monto válido')).toBeTruthy();
      expect(mockMutations.addExpense).not.toHaveBeenCalled();
    });

    it('un error queda en la hoja sin perder lo cargado', async () => {
      mockMutations.addExpense.mockRejectedValue(new Error('x'));
      await openSheet('100 Pan');

      await fireEvent.press(screen.getByRole('button', { name: 'Agregar gasto' }));

      expect(screen.getByText('No se pudo agregar el gasto')).toBeTruthy();
      expect(screen.getByLabelText('Detalle').props.value).toBe('Pan');
    });
  });

  describe('borrar', () => {
    const pressExpense = () => fireEvent.press(screen.getByRole('button', { name: /^Martín, Bebidas/ }));

    it('tocar un gasto ofrece eliminarlo, con confirmación', async () => {
      mockActionSheet.mockResolvedValue('delete');
      await render(<GatheringScreen />);

      await pressExpense();

      expect(mockConfirm).toHaveBeenCalledWith({
        title: 'Eliminar gasto',
        description: '"Bebidas · $27.000,00" se borra de la juntada y las cuentas se recalculan. No se puede deshacer.',
        confirmLabel: 'Eliminar',
      });
      expect(mockMutations.deleteExpense).toHaveBeenCalledWith('g1', 'e1');
    });

    it('cancelar no borra el gasto', async () => {
      mockActionSheet.mockResolvedValue('delete');
      mockConfirm.mockResolvedValue(false);
      await render(<GatheringScreen />);

      await pressExpense();

      expect(mockMutations.deleteExpense).not.toHaveBeenCalled();
    });

    it('si el borrado del gasto falla, avisa', async () => {
      mockActionSheet.mockResolvedValue('delete');
      mockMutations.deleteExpense.mockRejectedValue(new Error('x'));
      await render(<GatheringScreen />);

      await pressExpense();

      expect(notifyError).toHaveBeenCalledWith('No se pudo eliminar el gasto');
    });

    it('desde ⋯ elimina la juntada y vuelve', async () => {
      mockActionSheet.mockResolvedValue('delete');
      await render(<GatheringScreen />);

      await fireEvent.press(screen.getByRole('button', { name: 'Opciones de la juntada' }));

      expect(mockMutations.deleteGathering).toHaveBeenCalledWith('g1');
      expect(notifySuccess).toHaveBeenCalledWith('Juntada eliminada');
      expect(mockBack).toHaveBeenCalled();
    });

    it('si el borrado de la juntada falla se queda y avisa', async () => {
      mockActionSheet.mockResolvedValue('delete');
      mockMutations.deleteGathering.mockRejectedValue(new Error('x'));
      await render(<GatheringScreen />);

      await fireEvent.press(screen.getByRole('button', { name: 'Opciones de la juntada' }));

      expect(notifyError).toHaveBeenCalledWith('No se pudo eliminar la juntada');
      expect(mockBack).not.toHaveBeenCalled();
    });
  });

  describe('saldar', () => {
    it('muestra transferencias y saldos, y marca la juntada como saldada', async () => {
      jest.useFakeTimers();
      await render(<GatheringScreen />);

      await fireEvent.press(screen.getByRole('button', { name: 'Saldar' }));
      expect(screen.getByLabelText('Vos le transfiere $13.500,00 a Martín')).toBeTruthy();
      expect(screen.getByLabelText('Martín, pagó $27.000,00 · gastó $13.500,00, saldo +$13.500,00')).toBeTruthy();
      await fireEvent.press(screen.getByRole('button', { name: 'Marcar como saldada' }));
      await closeSheet();

      expect(mockMutations.setGatheringSettled).toHaveBeenCalledWith('g1', true);
      expect(notifySuccess).toHaveBeenCalledWith('Juntada saldada');
    });

    it('saldada es de solo lectura, con Reabrir y Compartir', async () => {
      const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction', activityType: undefined });
      mockUseGathering.mockReturnValue(
        loaded(gatheringDetail({ isSettled: true, expenses: [expense({ sharedWith: ['p0', 'p1'] })] }))
      );
      await render(<GatheringScreen />);

      expect(screen.getByText('Todo saldado')).toBeTruthy();
      expect(screen.getByText('No queda nada pendiente.')).toBeTruthy();
      expect(screen.getByText('Entre vos y Martín')).toBeTruthy();
      expect(screen.queryByRole('button', { name: /^Martín, Bebidas/ })).toBeNull();
      expect(screen.queryByLabelText('Monto y detalle')).toBeNull();

      await fireEvent.press(screen.getByRole('button', { name: 'Compartir' }));
      expect(share).toHaveBeenCalledWith({ message: expect.stringContaining('Ana Gómez → Martín: $13.500,00') });

      await fireEvent.press(screen.getByRole('button', { name: 'Reabrir' }));
      expect(mockMutations.setGatheringSettled).toHaveBeenCalledWith('g1', false);
      expect(notifySuccess).toHaveBeenCalledWith('Juntada reabierta');
    });
  });
});
