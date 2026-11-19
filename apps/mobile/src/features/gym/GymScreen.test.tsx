import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { ApiError } from '@omni/shared/api';

import { actionSheet, confirm, notifyError, notifySuccess } from '@/shared/ui';

import { day, exercise, planDetail, planSummary } from './fixtures';
import { GymScreen } from './GymScreen';

import type { GymPlanDetail, GymPlanSummary } from '@omni/shared/gym';

jest.mock('tamagui', () => jest.requireActual('@/test/tamaguiMock'));
jest.mock('@/core/theme', () => jest.requireActual('@/test/themeMock'));
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default
);
const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack, canGoBack: () => true, replace: jest.fn() }),
}));
jest.mock('@/shared/ui/notify/notify', () => ({
  ...jest.requireActual('@/shared/ui/notify/notify'),
  notifySuccess: jest.fn(),
}));
jest.mock('@/shared/ui', () => ({
  ...jest.requireActual('@/shared/ui'),
  actionSheet: jest.fn(),
  confirm: jest.fn(),
  notifyError: jest.fn(),
}));

let mockLastPlanId: string | null | undefined = 'p1';
const mockSetLastPlan = jest.fn();
jest.mock('./hooks/useLastGymPlan', () => ({
  useLastGymPlan: () => ({ lastPlanId: mockLastPlanId, setLastPlan: mockSetLastPlan }),
}));
let mockPlans: { plans?: GymPlanSummary[]; error?: Error } = {};
jest.mock('./hooks/useGymPlans', () => ({
  useGymPlans: () => ({ ...mockPlans, isLoading: false, mutate: jest.fn() }),
}));
let mockPlan: GymPlanDetail | undefined;
let mockPlanError: Error | undefined;
const mockUseGymPlan = jest.fn();
const mockRetryPlan = jest.fn();
jest.mock('./hooks/useGymPlan', () => ({
  useGymPlan: (id: string | null) => {
    mockUseGymPlan(id);
    return { plan: id ? mockPlan : undefined, isLoading: false, error: mockPlanError, mutate: mockRetryPlan };
  },
}));
const mockMutations = {
  addExercise: jest.fn(),
  updateExercise: jest.fn(),
  changeDay: jest.fn(),
  deleteDay: jest.fn(),
  removeExercise: jest.fn(),
  updateWeight: jest.fn(),
  createPlan: jest.fn(),
  renamePlan: jest.fn(),
  archivePlan: jest.fn(),
  unarchivePlan: jest.fn(),
  deletePlan: jest.fn(),
};
jest.mock('./hooks/useGymMutations', () => ({ useGymMutations: () => mockMutations }));
const mockFailure = jest.fn();
jest.mock('./hooks/useGymWriteFailure', () => ({ useGymWriteFailure: () => mockFailure }));

type Run<T> = (value: T) => unknown;
type WeightProps = {
  open: boolean;
  exercise: { name: string };
  readOnly: boolean;
  onSave: Run<number>;
  onClear: () => unknown;
  onClosed?: () => void;
};
type AddProps = { open: boolean; initialWeekday: string; onAdd: Run<object> };
type EditProps = { open: boolean; exercise: { name: string }; onSubmit: Run<object> };
type MoveProps = { open: boolean; exerciseName: string; occupiedWeekdays: string[]; onSubmit: Run<string> };
type ChangeDayProps = { open: boolean; weekday: string; occupiedWeekdays: string[]; onSubmit: Run<string> };
type NameProps = { open: boolean; initialName?: string; onSubmit: Run<string> };
jest.mock('./components/WeightSheet', () => {
  const { Pressable, Text, View } = jest.requireActual('react-native');
  return {
    WeightSheet: ({ open, exercise: target, readOnly, onSave, onClear, onClosed }: WeightProps) =>
      open ? (
        <View>
          <Text>{`Hoja de peso: ${target.name}${readOnly ? ' (solo lectura)' : ''}`}</Text>
          <Pressable accessibilityRole="button" onPress={() => void onSave(62.5)}>
            <Text>Guardar 62,5</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => void onClear()}>
            <Text>Quitar el peso</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => onClosed?.()}>
            <Text>Hoja cerrada</Text>
          </Pressable>
        </View>
      ) : null,
  };
});
jest.mock('./components/AddExerciseSheet', () => {
  const { Pressable, Text, View } = jest.requireActual('react-native');
  return {
    AddExerciseSheet: ({ open, initialWeekday, onAdd }: AddProps) =>
      open ? (
        <View>
          <Text>{`Hoja de agregar (${initialWeekday})`}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => void onAdd({ weekday: 'FRIDAY', name: 'Remo', sets: 3, reps: '10' })}
          >
            <Text>Agregar Remo</Text>
          </Pressable>
        </View>
      ) : null,
  };
});
jest.mock('./components/EditExerciseSheet', () => {
  const { Pressable, Text, View } = jest.requireActual('react-native');
  return {
    EditExerciseSheet: ({ open, exercise: target, onSubmit }: EditProps) =>
      open ? (
        <View>
          <Text>{`Hoja de editar ${target.name}`}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => void onSubmit({ name: 'Sentadilla', sets: 5, reps: '5' })}
          >
            <Text>Guardar cambios</Text>
          </Pressable>
        </View>
      ) : null,
  };
});
jest.mock('./components/MoveExerciseSheet', () => {
  const { Pressable, Text, View } = jest.requireActual('react-native');
  return {
    MoveExerciseSheet: ({ open, exerciseName, occupiedWeekdays, onSubmit }: MoveProps) =>
      open ? (
        <View>
          <Text>{`Hoja de mover ${exerciseName} (ocupados: ${occupiedWeekdays.join(',')})`}</Text>
          <Pressable accessibilityRole="button" onPress={() => void onSubmit('TUESDAY')}>
            <Text>Mover a martes</Text>
          </Pressable>
        </View>
      ) : null,
  };
});
jest.mock('./components/ChangeDaySheet', () => {
  const { Pressable, Text, View } = jest.requireActual('react-native');
  return {
    ChangeDaySheet: ({ open, weekday, occupiedWeekdays, onSubmit }: ChangeDayProps) =>
      open ? (
        <View>
          <Text>{`Hoja de cambiar día ${weekday} (ocupados: ${occupiedWeekdays.join(',')})`}</Text>
          <Pressable accessibilityRole="button" onPress={() => void onSubmit('THURSDAY')}>
            <Text>Pasar al jueves</Text>
          </Pressable>
        </View>
      ) : null,
  };
});
jest.mock('./components/PlanNameSheet', () => {
  const { Pressable, Text, View } = jest.requireActual('react-native');
  return {
    PlanNameSheet: ({ open, initialName, onSubmit }: NameProps) =>
      open ? (
        <View>
          <Text>{initialName ? `Renombrar ${initialName}` : 'Nuevo plan (hoja)'}</Text>
          <Pressable accessibilityRole="button" onPress={() => void onSubmit('Piernas')}>
            <Text>Guardar nombre</Text>
          </Pressable>
        </View>
      ) : null,
  };
});

const FULL_PLAN = planDetail({
  days: [
    day({
      id: 'd1',
      weekday: 'MONDAY',
      exercises: [
        exercise({ id: 'e1', name: 'Sentadilla', currentWeightKg: 60 }),
        exercise({ id: 'e2', catalogId: 'c2', name: 'Press de banca', sets: 4, reps: '10', currentWeightKg: 40 }),
      ],
    }),
    day({
      id: 'd3',
      weekday: 'WEDNESDAY',
      exercises: [
        exercise({ id: 'e3', catalogId: 'c3', name: 'Dominadas', sets: 3, reps: 'AMRAP', currentWeightKg: null }),
      ],
    }),
    day({
      id: 'd5',
      weekday: 'FRIDAY',
      exercises: [exercise({ id: 'e5', name: 'Sentadilla', currentWeightKg: 60 })],
    }),
  ],
});

type Option = { value: string; label: string; destructive?: boolean };
const lastOptions = () =>
  (jest.mocked(actionSheet).mock.calls.at(-1)![0].options as readonly Option[]).map(o => o.label);

beforeEach(() => {
  jest.clearAllMocks();
  mockLastPlanId = 'p1';
  mockPlans = { plans: [planSummary({ id: 'p1' }), planSummary({ id: 'p2', name: 'Hipertrofia' })] };
  mockPlan = FULL_PLAN;
  mockPlanError = undefined;
  mockSetLastPlan.mockResolvedValue(undefined);
  mockFailure.mockResolvedValue({ status: 'error', message: 'No se pudo', conflict: false });
  Object.values(mockMutations).forEach(fn => fn.mockResolvedValue(planDetail()));
  jest.mocked(confirm).mockResolvedValue(true);
});

describe('GymScreen', () => {
  describe('vista y estados', () => {
    it('muestra el plan con sus contadores, la tira de días y los ejercicios por día', async () => {
      await render(<GymScreen />);

      expect(mockUseGymPlan).toHaveBeenLastCalledWith('p1');
      expect(screen.getByText('3 días · 4 ejercicios')).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Plan Fuerza 3 días' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Lunes, 2 ejercicios' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Martes, sin ejercicios, agregar' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Opciones del lunes' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Opciones del plan' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Cargar peso de Dominadas' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Agregar ejercicio' })).toBeTruthy();
    });

    it('sin plan guardado (o si ya no existe) abre el primero de la lista', async () => {
      mockLastPlanId = 'borrado';
      await render(<GymScreen />);

      expect(mockUseGymPlan).toHaveBeenLastCalledWith('p1');
    });

    it('sin planes muestra el vacío con "Crear plan", que abre la hoja de alta', async () => {
      mockPlans = { plans: [] };
      await render(<GymScreen />);

      expect(screen.getByText('Todavía no tenés planes')).toBeTruthy();
      await fireEvent.press(screen.getByRole('button', { name: 'Crear plan' }));
      expect(screen.getByText('Nuevo plan (hoja)')).toBeTruthy();
    });

    it('crear un plan lo deja como último abierto y avisa al cerrarse la hoja', async () => {
      mockPlans = { plans: [] };
      mockMutations.createPlan.mockResolvedValue(planDetail({ id: 'nuevo' }));
      await render(<GymScreen />);
      await fireEvent.press(screen.getByRole('button', { name: 'Crear plan' }));

      await fireEvent.press(screen.getByRole('button', { name: 'Guardar nombre' }));

      await waitFor(() => expect(mockSetLastPlan).toHaveBeenCalledWith('nuevo'));
      expect(notifySuccess).not.toHaveBeenCalled();
    });

    it('el error del plan se muestra con reintento, no como plan vacío', async () => {
      mockPlan = undefined;
      mockPlanError = new Error('x');
      await render(<GymScreen />);

      expect(screen.getByText('No se pudo cargar tu plan')).toBeTruthy();
      await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));
      expect(mockRetryPlan).toHaveBeenCalled();
    });

    it('un 404 muestra "Plan no encontrado" con "Ver mis planes" y sin Reintentar', async () => {
      mockPlan = undefined;
      mockPlanError = new ApiError('Plan no encontrado', 404);
      await render(<GymScreen />);

      expect(screen.getByText('Plan no encontrado')).toBeTruthy();
      expect(screen.getByText('Puede que lo hayas borrado desde otro dispositivo.')).toBeTruthy();
      expect(screen.queryByRole('button', { name: 'Reintentar' })).toBeNull();
      await fireEvent.press(screen.getByRole('button', { name: 'Ver mis planes' }));
      expect(mockPush).toHaveBeenCalledWith('/gym/plans');
    });

    it('con el plan cargado y un error de revalidación sigue mostrándolo con un aviso', async () => {
      mockPlanError = new Error('x');
      await render(<GymScreen />);

      expect(screen.getByText('No se pudo actualizar tu plan')).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Opciones del lunes' })).toBeTruthy();
    });

    it('un plan sin ejercicios muestra su vacío', async () => {
      mockPlan = planDetail({ days: [] });
      await render(<GymScreen />);

      expect(screen.getByText('Este plan está vacío')).toBeTruthy();
    });

    it('el error de la lista se muestra con reintento, nunca como vacío', async () => {
      mockPlans = { error: new Error('x') };
      await render(<GymScreen />);

      expect(screen.getByText('No se pudieron cargar tus planes')).toBeTruthy();
    });

    it('la pill del plan abre "Tus planes"', async () => {
      await render(<GymScreen />);

      await fireEvent.press(screen.getByRole('button', { name: 'Plan Fuerza 3 días' }));

      expect(mockPush).toHaveBeenCalledWith('/gym/plans');
    });
  });

  describe('tira de días y agregar', () => {
    it('tocar un día vacío abre "Agregar ejercicio" con ese día', async () => {
      await render(<GymScreen />);

      await fireEvent.press(screen.getByRole('button', { name: 'Martes, sin ejercicios, agregar' }));

      expect(screen.getByText('Hoja de agregar (TUESDAY)')).toBeTruthy();
    });

    it('el botón principal abre el alta con el día de hoy', async () => {
      jest.useFakeTimers({ now: new Date(2026, 10, 18), doNotFake: ['setTimeout', 'clearTimeout', 'setInterval'] });
      await render(<GymScreen />);

      await fireEvent.press(screen.getByRole('button', { name: 'Agregar ejercicio' }));

      expect(screen.getByText('Hoja de agregar (WEDNESDAY)')).toBeTruthy();
      jest.useRealTimers();
    });

    it('agregar manda el ejercicio al plan que se está viendo y avisa "Ejercicio agregado"', async () => {
      await render(<GymScreen />);
      await fireEvent.press(screen.getByRole('button', { name: 'Agregar ejercicio' }));

      await fireEvent.press(screen.getByRole('button', { name: 'Agregar Remo' }));
      await waitFor(() =>
        expect(mockMutations.addExercise).toHaveBeenCalledWith({
          planId: 'p1',
          weekday: 'FRIDAY',
          name: 'Remo',
          sets: 3,
          reps: '10',
        })
      );
      expect(notifySuccess).not.toHaveBeenCalled();
    });
  });

  describe('peso', () => {
    it('guardar manda el peso y el aviso sale al cerrarse la hoja', async () => {
      await render(<GymScreen />);
      await fireEvent.press(screen.getAllByRole('button', { name: 'Sentadilla: 60 kg. Cambiar peso' })[0]!);
      expect(screen.getByText('Hoja de peso: Sentadilla')).toBeTruthy();

      await fireEvent.press(screen.getByText('Guardar 62,5'));
      await waitFor(() => expect(mockMutations.updateWeight).toHaveBeenCalledWith('e1', 62.5));
      expect(notifySuccess).not.toHaveBeenCalled();
      await fireEvent.press(screen.getByText('Hoja cerrada'));

      expect(notifySuccess).toHaveBeenCalledWith('Peso guardado');
    });

    it('quitar el peso manda null', async () => {
      await render(<GymScreen />);
      await fireEvent.press(screen.getAllByRole('button', { name: 'Sentadilla: 60 kg. Cambiar peso' })[0]!);

      await fireEvent.press(screen.getByText('Quitar el peso'));

      await waitFor(() => expect(mockMutations.updateWeight).toHaveBeenCalledWith('e1', null));
    });

    it('si el plan se archivó mientras tanto cierra la hoja y avisa el error cuando termina de ocultarse', async () => {
      mockMutations.updateWeight.mockRejectedValue(new ApiError('El plan está archivado', 409));
      mockFailure.mockResolvedValue({ status: 'closed', notice: 'El plan está archivado' });
      await render(<GymScreen />);
      await fireEvent.press(screen.getAllByRole('button', { name: 'Sentadilla: 60 kg. Cambiar peso' })[0]!);

      await fireEvent.press(screen.getByText('Guardar 62,5'));
      await waitFor(() => expect(mockFailure).toHaveBeenCalled());
      expect(notifyError).not.toHaveBeenCalled();
      await fireEvent.press(screen.getByText('Hoja cerrada'));

      expect(notifyError).toHaveBeenCalledWith('El plan está archivado');
    });
  });

  describe('menú del plan', () => {
    it('ofrece renombrar, archivar y eliminar (en rojo)', async () => {
      jest.mocked(actionSheet).mockResolvedValue(null);
      await render(<GymScreen />);

      await fireEvent.press(screen.getByRole('button', { name: 'Opciones del plan' }));

      expect(lastOptions()).toEqual(['Renombrar plan', 'Archivar plan', 'Eliminar plan']);
      const options = jest.mocked(actionSheet).mock.calls[0]![0].options as readonly Option[];
      expect(options.find(option => option.value === 'delete')?.destructive).toBe(true);
    });

    it('renombrar abre la hoja con el nombre cargado', async () => {
      jest.mocked(actionSheet).mockResolvedValue('rename');
      await render(<GymScreen />);

      await fireEvent.press(screen.getByRole('button', { name: 'Opciones del plan' }));

      await waitFor(() => expect(screen.getByText('Renombrar Fuerza 3 días')).toBeTruthy());
    });

    it('archivar no pide confirmación y avisa "Plan archivado"', async () => {
      jest.mocked(actionSheet).mockResolvedValue('archive');
      await render(<GymScreen />);

      await fireEvent.press(screen.getByRole('button', { name: 'Opciones del plan' }));

      await waitFor(() => expect(mockMutations.archivePlan).toHaveBeenCalledWith('p1'));
      expect(confirm).not.toHaveBeenCalled();
      expect(notifySuccess).toHaveBeenCalledWith('Plan archivado');
    });

    it('eliminar confirma con los días y ejercicios, borra, olvida el plan y vuelve a "Tus planes"', async () => {
      jest.mocked(actionSheet).mockResolvedValue('delete');
      await render(<GymScreen />);

      await fireEvent.press(screen.getByRole('button', { name: 'Opciones del plan' }));

      await waitFor(() => expect(mockMutations.deletePlan).toHaveBeenCalledWith('p1'));
      expect(confirm).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '¿Eliminar el plan?',
          description: expect.stringContaining('Se borran Fuerza 3 días, sus 3 días y 4 ejercicios.'),
          confirmLabel: 'Eliminar plan',
        })
      );
      expect(mockSetLastPlan).toHaveBeenCalledWith(null);
      expect(mockPush).toHaveBeenCalledWith('/gym/plans');
      expect(notifySuccess).toHaveBeenCalledWith('Plan eliminado');
    });

    it('si se cancela la confirmación no borra nada', async () => {
      jest.mocked(actionSheet).mockResolvedValue('delete');
      jest.mocked(confirm).mockResolvedValue(false);
      await render(<GymScreen />);

      await fireEvent.press(screen.getByRole('button', { name: 'Opciones del plan' }));

      await waitFor(() => expect(confirm).toHaveBeenCalled());
      expect(mockMutations.deletePlan).not.toHaveBeenCalled();
    });

    it('si falla archivar avisa con el mensaje que resuelve el manejo de errores', async () => {
      jest.mocked(actionSheet).mockResolvedValue('archive');
      mockMutations.archivePlan.mockRejectedValue(new Error('red'));
      mockFailure.mockResolvedValue({ status: 'error', message: 'No se pudo archivar el plan', conflict: false });
      await render(<GymScreen />);

      await fireEvent.press(screen.getByRole('button', { name: 'Opciones del plan' }));

      await waitFor(() => expect(notifyError).toHaveBeenCalledWith('No se pudo archivar el plan'));
    });
  });

  describe('menú del ejercicio', () => {
    it('tocar un ejercicio ofrece editar, mover de día y quitar (en rojo)', async () => {
      jest.mocked(actionSheet).mockResolvedValue(null);
      await render(<GymScreen />);

      await fireEvent.press(screen.getByRole('button', { name: 'Press de banca, 4 series · 10 repeticiones' }));

      expect(lastOptions()).toEqual(['Editar ejercicio', 'Mover de día', 'Quitar del día']);
      expect(jest.mocked(actionSheet).mock.calls[0]![0].description).toBe('4 series · 10 repeticiones · Lunes · 40 kg');
    });

    it('editar abre la hoja y guarda con "Ejercicio actualizado"', async () => {
      jest.mocked(actionSheet).mockResolvedValue('edit');
      await render(<GymScreen />);
      await fireEvent.press(screen.getByRole('button', { name: 'Press de banca, 4 series · 10 repeticiones' }));
      await waitFor(() => expect(screen.getByText('Hoja de editar Press de banca')).toBeTruthy());

      await fireEvent.press(screen.getByText('Guardar cambios'));

      await waitFor(() =>
        expect(mockMutations.updateExercise).toHaveBeenCalledWith('e2', { name: 'Sentadilla', sets: 5, reps: '5' })
      );
    });

    it('mover abre la hoja con los días donde la variante ya está y manda solo el día', async () => {
      jest.mocked(actionSheet).mockResolvedValue('move');
      await render(<GymScreen />);
      await fireEvent.press(screen.getAllByRole('button', { name: 'Sentadilla, 4 series · 12 repeticiones' })[0]!);
      await waitFor(() => expect(screen.getByText('Hoja de mover Sentadilla (ocupados: MONDAY,FRIDAY)')).toBeTruthy());

      await fireEvent.press(screen.getByText('Mover a martes'));

      await waitFor(() => expect(mockMutations.updateExercise).toHaveBeenCalledWith('e1', { weekday: 'TUESDAY' }));
    });

    it('quitar confirma con el aviso de la variante compartida y avisa "Ejercicio quitado"', async () => {
      jest.mocked(actionSheet).mockResolvedValue('remove');
      await render(<GymScreen />);

      await fireEvent.press(screen.getAllByRole('button', { name: 'Sentadilla, 4 series · 12 repeticiones' })[0]!);

      await waitFor(() => expect(mockMutations.removeExercise).toHaveBeenCalledWith('e1'));
      expect(confirm).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '¿Quitar Sentadilla del lunes?',
          description: expect.stringContaining('también está en el viernes'),
          confirmLabel: 'Quitar ejercicio',
        })
      );
      expect(notifySuccess).toHaveBeenCalledWith('Ejercicio quitado');
    });

    it('si se cancela la confirmación no lo quita', async () => {
      jest.mocked(actionSheet).mockResolvedValue('remove');
      jest.mocked(confirm).mockResolvedValue(false);
      await render(<GymScreen />);

      await fireEvent.press(screen.getByRole('button', { name: 'Press de banca, 4 series · 10 repeticiones' }));

      await waitFor(() => expect(confirm).toHaveBeenCalled());
      expect(mockMutations.removeExercise).not.toHaveBeenCalled();
    });

    it('un 404 al quitar avisa con el texto de la API', async () => {
      jest.mocked(actionSheet).mockResolvedValue('remove');
      mockMutations.removeExercise.mockRejectedValue(new ApiError('Ejercicio no encontrado', 404));
      mockFailure.mockResolvedValue({ status: 'closed', notice: 'Ejercicio no encontrado' });
      await render(<GymScreen />);

      await fireEvent.press(screen.getByRole('button', { name: 'Press de banca, 4 series · 10 repeticiones' }));

      await waitFor(() => expect(notifyError).toHaveBeenCalledWith('Ejercicio no encontrado'));
    });
  });

  describe('menú del día', () => {
    it('ofrece agregar, ordenar (con 2 o más ejercicios), cambiar de día y borrar', async () => {
      jest.mocked(actionSheet).mockResolvedValue(null);
      await render(<GymScreen />);

      await fireEvent.press(screen.getByRole('button', { name: 'Opciones del lunes' }));
      expect(lastOptions()).toEqual([
        'Agregar ejercicio a este día',
        'Ordenar ejercicios',
        'Cambiar de día',
        'Borrar día',
      ]);

      await fireEvent.press(screen.getByRole('button', { name: 'Opciones del miércoles' }));
      expect(lastOptions()).toEqual(['Agregar ejercicio a este día', 'Cambiar de día', 'Borrar día']);
    });

    it('"Agregar ejercicio a este día" abre el alta con ese día', async () => {
      jest.mocked(actionSheet).mockResolvedValue('add');
      await render(<GymScreen />);

      await fireEvent.press(screen.getByRole('button', { name: 'Opciones del miércoles' }));

      await waitFor(() => expect(screen.getByText('Hoja de agregar (WEDNESDAY)')).toBeTruthy());
    });

    it('"Ordenar ejercicios" abre la pantalla de orden del día', async () => {
      jest.mocked(actionSheet).mockResolvedValue('reorder');
      await render(<GymScreen />);

      await fireEvent.press(screen.getByRole('button', { name: 'Opciones del lunes' }));

      await waitFor(() =>
        expect(mockPush).toHaveBeenCalledWith({ pathname: '/gym/reorder', params: { planId: 'p1', dayId: 'd1' } })
      );
    });

    it('"Cambiar de día" abre la hoja con los días ocupados y manda el día elegido', async () => {
      jest.mocked(actionSheet).mockResolvedValue('changeDay');
      await render(<GymScreen />);
      await fireEvent.press(screen.getByRole('button', { name: 'Opciones del lunes' }));
      await waitFor(() =>
        expect(screen.getByText('Hoja de cambiar día MONDAY (ocupados: WEDNESDAY,FRIDAY)')).toBeTruthy()
      );

      await fireEvent.press(screen.getByText('Pasar al jueves'));

      await waitFor(() => expect(mockMutations.changeDay).toHaveBeenCalledWith('d1', 'THURSDAY'));
    });

    it('"Borrar día" confirma con la cantidad de ejercicios y avisa "Día borrado"', async () => {
      jest.mocked(actionSheet).mockResolvedValue('delete');
      await render(<GymScreen />);

      await fireEvent.press(screen.getByRole('button', { name: 'Opciones del lunes' }));

      await waitFor(() => expect(mockMutations.deleteDay).toHaveBeenCalledWith('d1'));
      expect(confirm).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '¿Borrar el lunes?',
          description: expect.stringContaining('Se borran sus 2 ejercicios de este plan.'),
        })
      );
      expect(notifySuccess).toHaveBeenCalledWith('Día borrado');
    });
  });

  describe('plan archivado', () => {
    beforeEach(() => {
      mockPlan = { ...FULL_PLAN, status: 'ARCHIVED' };
    });

    it('avisa que es de solo lectura, sin ⋯, sin agregar, y con Desarchivar y Eliminar al pie', async () => {
      await render(<GymScreen />);

      expect(screen.getByText('Plan archivado: solo podés mirarlo. Para editarlo, desarchivalo.')).toBeTruthy();
      expect(screen.getByText(/^Archivado · /)).toBeTruthy();
      expect(screen.queryByRole('button', { name: 'Opciones del plan' })).toBeNull();
      expect(screen.queryByRole('button', { name: 'Opciones del lunes' })).toBeNull();
      expect(screen.queryByRole('button', { name: 'Agregar ejercicio' })).toBeNull();
      expect(screen.getByRole('button', { name: 'Desarchivar plan' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Eliminar plan' })).toBeTruthy();
    });

    it('un día vacío de la tira no hace nada y el peso abre la hoja en solo lectura', async () => {
      await render(<GymScreen />);

      expect(screen.getByRole('button', { name: 'Martes, sin ejercicios' }).props.accessibilityState.disabled).toBe(
        true
      );
      await fireEvent.press(screen.getAllByRole('button', { name: 'Sentadilla: 60 kg. Ver historial' })[0]!);
      expect(screen.getByText('Hoja de peso: Sentadilla (solo lectura)')).toBeTruthy();
    });

    it('Desarchivar plan lo desarchiva sin confirmar', async () => {
      await render(<GymScreen />);

      await fireEvent.press(screen.getByRole('button', { name: 'Desarchivar plan' }));

      await waitFor(() => expect(mockMutations.unarchivePlan).toHaveBeenCalledWith('p1'));
      expect(confirm).not.toHaveBeenCalled();
      expect(notifySuccess).toHaveBeenCalledWith('Plan desarchivado');
    });

    it('Eliminar plan confirma y vuelve a "Tus planes"', async () => {
      await render(<GymScreen />);

      await fireEvent.press(screen.getByRole('button', { name: 'Eliminar plan' }));

      await waitFor(() => expect(mockMutations.deletePlan).toHaveBeenCalledWith('p1'));
      expect(mockPush).toHaveBeenCalledWith('/gym/plans');
    });
  });
});
