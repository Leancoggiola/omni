import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { notifySuccess, SHEET_EXIT_MS } from '@/shared/ui';

import { planDetail, planSummary } from './fixtures';
import { GymPlansScreen } from './GymPlansScreen';

import type { GymPlanStatus, GymPlanSummary } from '@omni/shared/gym';

jest.mock('tamagui', () => jest.requireActual('@/test/tamaguiMock'));
jest.mock('@/core/theme', () => jest.requireActual('@/test/themeMock'));
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default
);
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, canGoBack: () => true, replace: jest.fn(), push: jest.fn() }),
}));
jest.mock('@/shared/ui', () => ({ ...jest.requireActual('@/shared/ui'), notifySuccess: jest.fn() }));

const mockUseGymPlans = jest.fn();
jest.mock('./hooks/useGymPlansPaged', () => ({
  useGymPlansPaged: (status: GymPlanStatus) => mockUseGymPlans(status),
}));
const mockLoadMore = jest.fn();
const mockSetLastPlan = jest.fn();
jest.mock('./hooks/useLastGymPlan', () => ({
  useLastGymPlan: () => ({ lastPlanId: 'p1', setLastPlan: mockSetLastPlan }),
}));
const mockCreatePlan = jest.fn();
jest.mock('./hooks/useGymMutations', () => ({ useGymMutations: () => ({ createPlan: mockCreatePlan }) }));

const ACTIVE: GymPlanSummary[] = [
  planSummary({ id: 'p1', name: 'Fuerza 3 días', dayCount: 3, exerciseCount: 8 }),
  planSummary({ id: 'p2', name: 'Hipertrofia', dayCount: 5, exerciseCount: 17 }),
];

beforeEach(() => {
  jest.clearAllMocks();
  mockUseGymPlans.mockImplementation((status: GymPlanStatus) => ({
    plans: status === 'ACTIVE' ? ACTIVE : [],
    hasMore: false,
    isLoading: false,
    isLoadingMore: false,
    error: undefined,
    loadMore: mockLoadMore,
    mutate: jest.fn(),
  }));
  mockSetLastPlan.mockResolvedValue(undefined);
  mockCreatePlan.mockResolvedValue(planDetail({ id: 'nuevo', name: 'Piernas' }));
});

describe('GymPlansScreen', () => {
  it('lista los planes activos con sus contadores', async () => {
    await render(<GymPlansScreen />);

    expect(mockUseGymPlans).toHaveBeenLastCalledWith('ACTIVE');
    expect(screen.getByRole('button', { name: 'Fuerza 3 días, 3 días · 8 ejercicios' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Hipertrofia, 5 días · 17 ejercicios' })).toBeTruthy();
  });

  it('Archivados cambia el filtro y muestra su vacío', async () => {
    await render(<GymPlansScreen />);

    await fireEvent.press(screen.getByText('Archivados'));
    expect(mockUseGymPlans).toHaveBeenLastCalledWith('ARCHIVED');
    expect(screen.getByText('No tenés planes archivados')).toBeTruthy();
    expect(
      screen.getByText(
        'Cuando archives un plan lo vas a ver acá, en solo lectura, y lo podés desarchivar cuando quieras.'
      )
    ).toBeTruthy();
  });

  it('sin planes activos ofrece crear uno y ver los archivados', async () => {
    mockUseGymPlans.mockImplementation((status: GymPlanStatus) => ({
      plans: [],
      hasMore: false,
      isLoading: false,
      isLoadingMore: false,
      error: undefined,
      loadMore: mockLoadMore,
      mutate: jest.fn(),
      status,
    }));
    await render(<GymPlansScreen />);

    expect(screen.getByText('No tenés planes activos')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Crear plan' })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Ver archivados' }));
    expect(mockUseGymPlans).toHaveBeenLastCalledWith('ARCHIVED');
  });

  it('con más planes ofrece "Ver más", que pide la página siguiente', async () => {
    mockUseGymPlans.mockReturnValue({
      plans: ACTIVE,
      hasMore: true,
      isLoading: false,
      isLoadingMore: false,
      error: undefined,
      loadMore: mockLoadMore,
      mutate: jest.fn(),
    });
    await render(<GymPlansScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Ver más' }));

    expect(mockLoadMore).toHaveBeenCalled();
  });

  it('mientras carga muestra el skeleton', async () => {
    mockUseGymPlans.mockReturnValue({
      plans: undefined,
      hasMore: false,
      isLoading: true,
      isLoadingMore: false,
      error: undefined,
      loadMore: mockLoadMore,
      mutate: jest.fn(),
    });
    await render(<GymPlansScreen />);

    expect(screen.getByLabelText('Cargando')).toBeTruthy();
  });

  it('el error se muestra con reintento', async () => {
    mockUseGymPlans.mockReturnValue({
      plans: undefined,
      hasMore: false,
      isLoading: false,
      isLoadingMore: false,
      error: new Error('503'),
      loadMore: mockLoadMore,
      mutate: jest.fn(),
    });
    await render(<GymPlansScreen />);

    expect(screen.getByText('No se pudieron cargar tus planes')).toBeTruthy();
  });

  it('tocar un plan lo elige y vuelve al gimnasio', async () => {
    await render(<GymPlansScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Hipertrofia, 5 días · 17 ejercicios' }));

    await waitFor(() => expect(mockBack).toHaveBeenCalled());
    expect(mockSetLastPlan).toHaveBeenCalledWith('p2');
  });

  it('"Nuevo plan" crea el plan, lo elige y vuelve al gimnasio cuando cierra la hoja', async () => {
    jest.useFakeTimers();
    await render(<GymPlansScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Nuevo plan' }));
    await fireEvent.changeText(screen.getByLabelText('Nombre, obligatorio'), '  Piernas ');
    await fireEvent.press(screen.getByRole('button', { name: 'Crear plan' }));
    await act(async () => {
      await jest.advanceTimersByTimeAsync(SHEET_EXIT_MS);
    });

    expect(mockCreatePlan).toHaveBeenCalledWith('Piernas');
    expect(mockSetLastPlan).toHaveBeenCalledWith('nuevo');
    expect(notifySuccess).toHaveBeenCalledWith('Plan creado');
    expect(mockBack).toHaveBeenCalled();
    jest.useRealTimers();
  });
});
