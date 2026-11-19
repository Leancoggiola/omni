import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { ApiError } from '@omni/shared/api';

import { notifyError, notifySuccess } from '@/shared/ui';

import { day, exercise, planDetail } from './fixtures';
import { GymReorderScreen } from './GymReorderScreen';

import type { GymPlanDetail } from '@omni/shared/gym';

jest.mock('tamagui', () => jest.requireActual('@/test/tamaguiMock'));
jest.mock('@/core/theme', () => jest.requireActual('@/test/themeMock'));
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default
);
const mockBack = jest.fn();
let mockParams: { planId?: string; dayId?: string } = { planId: 'p1', dayId: 'd1' };
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, canGoBack: () => true, replace: jest.fn() }),
  useLocalSearchParams: () => mockParams,
}));
jest.mock('@/shared/ui', () => ({
  ...jest.requireActual('@/shared/ui'),
  notifySuccess: jest.fn(),
  notifyError: jest.fn(),
}));

let mockPlan: GymPlanDetail | undefined;
const mockRevalidatePlan = jest.fn();
jest.mock('./hooks/useGymPlan', () => ({
  useGymPlan: () => ({ plan: mockPlan, isLoading: false, error: undefined, mutate: mockRevalidatePlan }),
}));
const mockReorderDay = jest.fn();
jest.mock('./hooks/useGymMutations', () => ({ useGymMutations: () => ({ reorderDay: mockReorderDay }) }));

const MONDAY = day({
  id: 'd1',
  weekday: 'MONDAY',
  exercises: [
    exercise({ id: 'e1', name: 'Sentadilla' }),
    exercise({ id: 'e2', name: 'Press de banca', reps: '10' }),
    exercise({ id: 'e3', name: 'Remo con barra', sets: 3, reps: '10' }),
  ],
});

const saveButton = () => screen.getByRole('button', { name: 'Guardar orden' });

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = { planId: 'p1', dayId: 'd1' };
  mockPlan = planDetail({ days: [MONDAY] });
  mockReorderDay.mockResolvedValue(planDetail());
  mockRevalidatePlan.mockResolvedValue(undefined);
});

describe('GymReorderScreen', () => {
  it('si el día cambia mientras se ordena avisa antes de guardar y no deja guardar', async () => {
    const { rerender } = await render(<GymReorderScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Bajar Sentadilla' }));
    expect(saveButton().props.accessibilityState.disabled).toBe(false);

    mockPlan = planDetail({
      days: [day({ id: 'd1', weekday: 'MONDAY', exercises: [MONDAY.exercises[0]!, MONDAY.exercises[2]!] })],
    });
    await rerender(<GymReorderScreen />);

    expect(screen.getByText(/El día cambió mientras lo ordenabas/)).toBeTruthy();
    expect(saveButton().props.accessibilityState.disabled).toBe(true);
  });

  it('sin plan o día en la ruta lo dice en vez de quedarse cargando', async () => {
    mockParams = {};
    mockPlan = undefined;

    await render(<GymReorderScreen />);

    expect(screen.getByText('No encontramos el día')).toBeTruthy();
    expect(screen.queryByRole('progressbar', { name: 'Cargando' })).toBeNull();
  });

  it('titula con el día, deshabilita las flechas de los extremos y Guardar sin cambios', async () => {
    await render(<GymReorderScreen />);

    expect(screen.getByText('Movelos con las flechas')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Subir Sentadilla' }).props.accessibilityState.disabled).toBe(true);
    expect(screen.getByRole('button', { name: 'Bajar Remo con barra' }).props.accessibilityState.disabled).toBe(true);
    expect(saveButton().props.accessibilityState.disabled).toBe(true);
  });

  it('mover y guardar manda la lista completa del día en el orden nuevo', async () => {
    await render(<GymReorderScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Bajar Sentadilla' }));
    expect(screen.getByRole('button', { name: 'Subir Press de banca' }).props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(saveButton());

    await waitFor(() => expect(mockBack).toHaveBeenCalled());
    expect(mockReorderDay).toHaveBeenCalledWith('d1', ['e2', 'e1', 'e3']);
    expect(notifySuccess).toHaveBeenCalledWith('Orden guardado');
  });

  it('volver al orden original deshabilita Guardar', async () => {
    await render(<GymReorderScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Bajar Sentadilla' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Subir Sentadilla' }));
    expect(saveButton().props.accessibilityState.disabled).toBe(true);
  });

  it('un 409 muestra el aviso con "Recargar el día", bloquea Guardar y al recargar vuelve al orden de la API', async () => {
    mockReorderDay.mockRejectedValue(new ApiError('La lista no coincide con los ejercicios del día', 409));
    mockRevalidatePlan.mockResolvedValue(planDetail({ days: [MONDAY] }));
    await render(<GymReorderScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Bajar Sentadilla' }));
    await act(async () => await fireEvent.press(saveButton()));

    expect(screen.getByText(/La lista no coincide con los ejercicios del día/)).toBeTruthy();
    expect(screen.getByText(/Recargá el día para ver la lista actual y volvé a ordenar\./)).toBeTruthy();
    expect(saveButton().props.accessibilityState.disabled).toBe(true);
    expect(mockBack).not.toHaveBeenCalled();

    await act(async () => await fireEvent.press(screen.getByRole('button', { name: 'Recargar el día' })));

    expect(mockRevalidatePlan).toHaveBeenCalled();
    expect(screen.queryByText(/Recargá el día/)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Recargar el día' })).toBeNull();
  });

  it('un 409 porque el plan se archivó avisa y vuelve, sin ofrecer recargar', async () => {
    mockReorderDay.mockRejectedValue(new ApiError('El plan está archivado', 409));
    mockRevalidatePlan.mockResolvedValue(planDetail({ status: 'ARCHIVED', days: [MONDAY] }));
    await render(<GymReorderScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Bajar Sentadilla' }));
    await act(async () => await fireEvent.press(saveButton()));

    expect(notifyError).toHaveBeenCalledWith('El plan está archivado');
    expect(mockBack).toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Recargar el día' })).toBeNull();
  });

  it('otro error se avisa y conserva el orden', async () => {
    mockReorderDay.mockRejectedValue(new Error('red'));
    await render(<GymReorderScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Bajar Sentadilla' }));
    await act(async () => await fireEvent.press(saveButton()));

    expect(notifyError).toHaveBeenCalledWith('No se pudo guardar el orden');
    expect(saveButton().props.accessibilityState.disabled).toBe(false);
  });

  it('Cancelar vuelve sin guardar', async () => {
    await render(<GymReorderScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Bajar Sentadilla' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Cancelar' }));

    expect(mockBack).toHaveBeenCalled();
    expect(mockReorderDay).not.toHaveBeenCalled();
  });

  it('con el plan archivado no deja ordenar', async () => {
    mockPlan = planDetail({ status: 'ARCHIVED', days: [MONDAY] });
    await render(<GymReorderScreen />);

    expect(screen.getByText('El plan está archivado')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Guardar orden' })).toBeNull();
  });
});
