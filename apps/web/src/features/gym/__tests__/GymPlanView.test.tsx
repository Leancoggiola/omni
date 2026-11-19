import { Box } from '@mantine/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/__tests__/helpers';
import { ApiError } from '@/shared/api';

import { GymPlanView } from '../components/GymPlanView';
import { day, exercise, planDetail } from './fixtures';

import type { GymWriteFailure } from '../hooks/useGymWriteFailure';
import type { GymPlanDetail, GymWeekday } from '@omni/shared/gym';

import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mocks = vi.hoisted(() => ({
  plan: {
    plan: undefined as GymPlanDetail | undefined,
    isLoading: false,
    error: undefined as unknown,
    mutate: vi.fn(),
  },
  exercises: {
    addExercise: vi.fn(),
    updateExercise: vi.fn(),
    moveExercise: vi.fn(),
    updateWeight: vi.fn(),
    deleteExercise: vi.fn(),
    reorderDay: vi.fn(),
  },
  days: { changeDay: vi.fn(), deleteDay: vi.fn() },
  failure: vi.fn(),
  confirm: vi.fn(),
  notifySuccess: vi.fn(),
  notifyError: vi.fn(),
}));

vi.mock('../hooks/useGymPlan', () => ({ useGymPlan: () => mocks.plan }));
vi.mock('../hooks/useGymExerciseMutations', () => ({ useGymExerciseMutations: () => mocks.exercises }));
vi.mock('../hooks/useGymDayMutations', () => ({ useGymDayMutations: () => mocks.days }));
vi.mock('../hooks/useGymWriteFailure', () => ({ useGymWriteFailure: () => mocks.failure }));
vi.mock('../hooks/useGymCatalog', () => ({
  CATALOG_MIN_QUERY_LENGTH: 2,
  useGymCatalog: () => ({ suggestions: [], queried: false, searching: false, error: undefined, retry: vi.fn() }),
}));
vi.mock('../hooks/useGymWeightHistory', () => ({
  WEIGHT_HISTORY_PAGE_SIZE: 5,
  useGymWeightHistory: () => ({ entries: [], total: 0, error: undefined, mutate: vi.fn() }),
}));
vi.mock('@/shared/ui', async importOriginal => ({
  ...(await importOriginal<typeof import('@/shared/ui')>()),
  confirm: mocks.confirm,
  notifySuccess: mocks.notifySuccess,
  notifyError: mocks.notifyError,
}));

const fullPlan = planDetail({
  days: [
    day({
      exercises: [exercise(), exercise({ id: 'e2', catalogId: 'c2', name: 'Press de banca', currentWeightKg: null })],
    }),
    day({ id: 'd3', weekday: 'WEDNESDAY', exercises: [exercise({ id: 'e3', catalogId: 'c3', name: 'Peso muerto' })] }),
    day({ id: 'd5', weekday: 'FRIDAY', exercises: [exercise({ id: 'e5', name: 'Sentadilla' })] }),
  ],
});

interface ViewOptions {
  orderingDayId?: string | null;
}

function renderView(options: ViewOptions = {}) {
  const props = {
    onAddWeekdayChange: vi.fn<(weekday: GymWeekday | null) => void>(),
    onOrderingDayChange: vi.fn<(dayId: string | null) => void>(),
    onShowPlans: vi.fn(),
  };
  renderWithProviders(
    <GymPlanView
      planId="plan1"
      toolbar={<Box role="toolbar" aria-label="Barra del plan" />}
      addWeekday={null}
      orderingDayId={options.orderingDayId ?? null}
      {...props}
    />
  );
  return props;
}

/** El dropdown de Mantine queda con `display: none` en happy-dom (sin layout): la consulta incluye lo oculto. */
async function menuItem(trigger: string, name: string) {
  await userEvent.click(screen.getAllByRole('button', { name: trigger })[0]!);
  return screen.findByRole('menuitem', { name, hidden: true });
}

const alertWith = async (message: string) => (await screen.findByText(message)).closest('[role="alert"]')!;

describe('GymPlanView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.plan = { plan: fullPlan, isLoading: false, error: undefined, mutate: vi.fn() };
    [...Object.values(mocks.exercises), ...Object.values(mocks.days)].forEach(fn => fn.mockResolvedValue(undefined));
    mocks.failure.mockResolvedValue('other' satisfies GymWriteFailure);
    mocks.confirm.mockResolvedValue(true);
  });

  afterEach(() => vi.useRealTimers());

  describe('carga y errores', () => {
    it('si falla la carga muestra el error con reintento, no un plan vacío', async () => {
      mocks.plan = { ...mocks.plan, plan: undefined, error: new Error('x') };
      renderView();

      expect(screen.getByText('No se pudo cargar tu plan')).toBeInTheDocument();
      expect(screen.queryByText('Este plan está vacío')).not.toBeInTheDocument();
      expect(screen.getByRole('toolbar', { name: 'Barra del plan' })).toBeInTheDocument();
      await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
      expect(mocks.plan.mutate).toHaveBeenCalled();
    });

    it('un 404 muestra "Plan no encontrado" con "Ver mis planes" y sin "Reintentar"', async () => {
      mocks.plan = { ...mocks.plan, plan: undefined, error: new ApiError('Plan no encontrado', 404) };
      const props = renderView();

      expect(screen.getByText('Plan no encontrado')).toBeInTheDocument();
      expect(screen.getByText('Puede que lo hayas borrado desde otro dispositivo.')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument();
      await userEvent.click(screen.getByRole('button', { name: 'Ver mis planes' }));
      expect(props.onShowPlans).toHaveBeenCalled();
    });

    it('mientras carga muestra el skeleton y la barra del plan, para poder cambiar de plan', () => {
      mocks.plan = { ...mocks.plan, plan: undefined, isLoading: true };
      renderView();

      expect(screen.getByRole('status', { name: 'Cargando' })).toBeInTheDocument();
      expect(screen.getByRole('toolbar', { name: 'Barra del plan' })).toBeInTheDocument();
    });
  });

  describe('vista', () => {
    it('muestra los contadores (cuentan filas) y solo los días con ejercicios, de lunes a domingo', () => {
      renderView();

      expect(screen.getByRole('group', { name: 'Días de entrenamiento' })).toHaveTextContent('3');
      expect(screen.getByRole('group', { name: 'Ejercicios' })).toHaveTextContent('4');
      expect(screen.getByRole('group', { name: 'Sin peso cargado' })).toHaveTextContent('1');
      expect(screen.getAllByRole('heading', { level: 2 }).map(h => h.textContent)).toEqual([
        'Lunes',
        'Miércoles',
        'Viernes',
      ]);
    });

    it('un plan sin ejercicios ofrece agregar el primero, con el día de hoy', async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date(2026, 10, 18));
      mocks.plan = { ...mocks.plan, plan: planDetail({ days: [] }) };
      const props = renderView();

      expect(screen.getByText('Este plan está vacío')).toBeInTheDocument();
      await userEvent.click(screen.getByRole('button', { name: 'Agregar ejercicio' }), { delay: null });
      expect(props.onAddWeekdayChange).toHaveBeenCalledWith('WEDNESDAY');
    });

    it('un plan archivado muestra el aviso y no tiene menús ni acciones de escritura', () => {
      mocks.plan = { ...mocks.plan, plan: { ...fullPlan, status: 'ARCHIVED' } };
      renderView();

      expect(screen.getByText('Plan archivado')).toBeInTheDocument();
      expect(screen.getByText('Solo podés mirarlo. Para editarlo, desarchivalo.')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Opciones/ })).not.toBeInTheDocument();
    });

    it('en un plan archivado vacío no ofrece agregar', () => {
      mocks.plan = { ...mocks.plan, plan: planDetail({ status: 'ARCHIVED', days: [] }) };
      renderView();

      expect(screen.queryByRole('button', { name: 'Agregar ejercicio' })).not.toBeInTheDocument();
    });
  });

  describe('peso', () => {
    it('guardar llama a la mutación con el ejercicio y avisa', async () => {
      renderView();

      await userEvent.click(screen.getByRole('button', { name: 'Peso de Peso muerto: 60 kg' }));
      expect(await screen.findByRole('dialog', { name: /Peso muerto/ })).toHaveTextContent('Miércoles');
      await userEvent.click(screen.getByRole('button', { name: 'Sumar 2,5 kg' }));
      await userEvent.click(screen.getByRole('button', { name: 'Guardar peso' }));

      await waitFor(() => expect(mocks.exercises.updateWeight).toHaveBeenCalledWith('e3', 62.5));
      expect(mocks.notifySuccess).toHaveBeenCalledWith('Peso guardado');
    });

    it('quitar el peso manda null, avisa "Peso quitado" y no pide confirmación', async () => {
      renderView();

      await userEvent.click(screen.getByRole('button', { name: 'Peso de Peso muerto: 60 kg' }));
      await userEvent.click(await screen.findByRole('button', { name: 'Quitar peso' }));

      await waitFor(() => expect(mocks.exercises.updateWeight).toHaveBeenCalledWith('e3', null));
      expect(mocks.notifySuccess).toHaveBeenCalledWith('Peso quitado');
      expect(mocks.confirm).not.toHaveBeenCalled();
    });

    it('si el plan se archivó desde otro dispositivo cierra el modal (el aviso lo da el manejo de errores)', async () => {
      mocks.exercises.updateWeight.mockRejectedValue(new ApiError('El plan está archivado', 409));
      mocks.failure.mockResolvedValue('archived' satisfies GymWriteFailure);
      renderView();

      await userEvent.click(screen.getByRole('button', { name: 'Peso de Peso muerto: 60 kg' }));
      await userEvent.click(await screen.findByRole('button', { name: 'Sumar 2,5 kg' }));
      await userEvent.click(screen.getByRole('button', { name: 'Guardar peso' }));

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      expect(mocks.failure).toHaveBeenCalledWith(expect.any(ApiError), 'No se pudo guardar el peso');
    });

    it('si el plan pasó a archivado descarta el pedido de alta que quedó cargado', async () => {
      mocks.exercises.updateWeight.mockRejectedValue(new ApiError('El plan está archivado', 409));
      mocks.failure.mockResolvedValue('archived' satisfies GymWriteFailure);
      const props = renderView();

      await userEvent.click(screen.getByRole('button', { name: 'Peso de Peso muerto: 60 kg' }));
      await userEvent.click(await screen.findByRole('button', { name: 'Sumar 2,5 kg' }));
      await userEvent.click(screen.getByRole('button', { name: 'Guardar peso' }));

      await waitFor(() => expect(props.onAddWeekdayChange).toHaveBeenCalledWith(null));
    });

    it('con un error de red el modal queda abierto', async () => {
      mocks.exercises.updateWeight.mockRejectedValue(new Error('red'));
      renderView();

      await userEvent.click(screen.getByRole('button', { name: 'Peso de Peso muerto: 60 kg' }));
      await userEvent.click(await screen.findByRole('button', { name: 'Sumar 2,5 kg' }));
      await userEvent.click(screen.getByRole('button', { name: 'Guardar peso' }));

      await waitFor(() => expect(mocks.failure).toHaveBeenCalled());
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  describe('ejercicios', () => {
    it('quitar un ejercicio pide confirmación con el aviso de peso e historial y lo quita', async () => {
      renderView();

      await userEvent.click(await menuItem('Opciones de Press de banca', 'Quitar del día'));

      expect(mocks.confirm).toHaveBeenCalledWith({
        title: '¿Quitar Press de banca del lunes?',
        description:
          'Se quita solo de este día. Si no lo usás en otro día ni en otro plan, también se borran su peso y su historial.',
        confirmLabel: 'Quitar ejercicio',
      });
      await waitFor(() => expect(mocks.exercises.deleteExercise).toHaveBeenCalledWith('e2'));
      expect(mocks.notifySuccess).toHaveBeenCalledWith('Ejercicio quitado');
    });

    it('si la misma variante sigue en otro día del plan lo dice', async () => {
      renderView();

      await userEvent.click(await menuItem('Opciones de Sentadilla', 'Quitar del día'));

      expect(mocks.confirm).toHaveBeenCalledWith(
        expect.objectContaining({
          description: expect.stringContaining('también está en el viernes'),
        })
      );
    });

    it('si se cancela la confirmación no quita nada', async () => {
      mocks.confirm.mockResolvedValue(false);
      renderView();

      await userEvent.click(await menuItem('Opciones de Press de banca', 'Quitar del día'));

      await waitFor(() => expect(mocks.confirm).toHaveBeenCalled());
      expect(mocks.exercises.deleteExercise).not.toHaveBeenCalled();
    });

    it('si quitar falla delega en el manejo de errores con el texto de la acción', async () => {
      mocks.exercises.deleteExercise.mockRejectedValue(new ApiError('Ejercicio no encontrado', 404));
      mocks.failure.mockResolvedValue('notFound' satisfies GymWriteFailure);
      renderView();

      await userEvent.click(await menuItem('Opciones de Press de banca', 'Quitar del día'));

      await waitFor(() =>
        expect(mocks.failure).toHaveBeenCalledWith(expect.any(ApiError), 'No se pudo quitar el ejercicio')
      );
      expect(mocks.notifySuccess).not.toHaveBeenCalled();
    });

    it('editar manda los datos, avisa "Ejercicio actualizado" y cierra', async () => {
      renderView();

      await userEvent.click(await menuItem('Opciones de Press de banca', 'Editar'));
      const dialog = await screen.findByRole('dialog', { name: 'Editar ejercicio' });
      const reps = within(dialog).getByRole('textbox', { name: /Repeticiones/ });
      await userEvent.clear(reps);
      await userEvent.type(reps, '8');
      await userEvent.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }));

      await waitFor(() =>
        expect(mocks.exercises.updateExercise).toHaveBeenCalledWith('e2', {
          name: 'Press de banca',
          sets: 4,
          reps: '8',
        })
      );
      expect(mocks.notifySuccess).toHaveBeenCalledWith('Ejercicio actualizado');
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    });

    it('un 409 al editar queda como aviso en el formulario con el mensaje de la API y no cierra', async () => {
      mocks.exercises.updateExercise.mockRejectedValue(
        new ApiError('Ya existe un ejercicio con ese nombre, series y repeticiones', 409)
      );
      mocks.failure.mockResolvedValue('conflict' satisfies GymWriteFailure);
      renderView();

      await userEvent.click(await menuItem('Opciones de Press de banca', 'Editar'));
      const dialog = await screen.findByRole('dialog', { name: 'Editar ejercicio' });
      await userEvent.type(within(dialog).getByRole('textbox', { name: /Nombre/ }), '!');
      await userEvent.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }));

      expect(await alertWith('Ya existe un ejercicio con ese nombre, series y repeticiones')).toBeInTheDocument();
      expect(screen.getByRole('dialog', { name: 'Editar ejercicio' })).toBeInTheDocument();
      expect(mocks.notifySuccess).not.toHaveBeenCalled();
    });

    it('mover deshabilita los días donde la variante ya está, manda solo el día y avisa', async () => {
      renderView();

      await userEvent.click(await menuItem('Opciones de Sentadilla', 'Mover de día'));
      await userEvent.click(await screen.findByRole('combobox', { name: /Mover a/ }));
      expect(screen.getByRole('option', { name: 'Viernes · ya lo tiene', hidden: true })).toHaveAttribute(
        'data-combobox-disabled'
      );
      await userEvent.click(screen.getByRole('option', { name: 'Martes', hidden: true }));
      await userEvent.click(screen.getByRole('button', { name: 'Mover ejercicio' }));

      await waitFor(() => expect(mocks.exercises.moveExercise).toHaveBeenCalledWith('e1', 'TUESDAY'));
      expect(mocks.notifySuccess).toHaveBeenCalledWith('Ejercicio movido');
    });
  });

  describe('días', () => {
    it('"Agregar ejercicio a este día" pide el alta con ese día', async () => {
      const props = renderView();

      await userEvent.click(await menuItem('Opciones del miércoles', 'Agregar ejercicio a este día'));

      expect(props.onAddWeekdayChange).toHaveBeenCalledWith('WEDNESDAY');
    });

    it('cambiar de día deshabilita los ocupados, manda el día y avisa "Día cambiado"', async () => {
      renderView();

      await userEvent.click(await menuItem('Opciones del lunes', 'Cambiar de día'));
      await userEvent.click(await screen.findByRole('combobox', { name: /Pasar el lunes a/ }));
      expect(screen.getByRole('option', { name: 'Miércoles · ya tiene ejercicios', hidden: true })).toHaveAttribute(
        'data-combobox-disabled'
      );
      await userEvent.click(screen.getByRole('option', { name: 'Jueves', hidden: true }));
      await userEvent.click(screen.getByRole('button', { name: 'Cambiar de día' }));

      await waitFor(() => expect(mocks.days.changeDay).toHaveBeenCalledWith('d1', 'THURSDAY'));
      expect(mocks.notifySuccess).toHaveBeenCalledWith('Día cambiado');
    });

    it('un 409 al cambiar de día queda como aviso en el formulario', async () => {
      mocks.days.changeDay.mockRejectedValue(new ApiError('El plan ya tiene ese día', 409));
      mocks.failure.mockResolvedValue('conflict' satisfies GymWriteFailure);
      renderView();

      await userEvent.click(await menuItem('Opciones del lunes', 'Cambiar de día'));
      await userEvent.click(await screen.findByRole('combobox', { name: /Pasar el lunes a/ }));
      await userEvent.click(screen.getByRole('option', { name: 'Jueves', hidden: true }));
      await userEvent.click(screen.getByRole('button', { name: 'Cambiar de día' }));

      expect(await alertWith('El plan ya tiene ese día')).toBeInTheDocument();
      expect(screen.getByRole('dialog', { name: /Cambiar de día/ })).toBeInTheDocument();
    });

    it('borrar un día confirma con la cantidad de ejercicios, lo borra y avisa "Día borrado"', async () => {
      renderView();

      await userEvent.click(await menuItem('Opciones del lunes', 'Borrar día'));

      expect(mocks.confirm).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '¿Borrar el lunes?',
          description: expect.stringContaining('Se borran sus 2 ejercicios de este plan.'),
        })
      );
      await waitFor(() => expect(mocks.days.deleteDay).toHaveBeenCalledWith('d1'));
      expect(mocks.notifySuccess).toHaveBeenCalledWith('Día borrado');
    });
  });

  describe('ordenar', () => {
    it('si el día en modo orden ya no existe sale del modo orden', async () => {
      const props = renderView({ orderingDayId: 'dia-que-no-existe' });

      await waitFor(() => expect(props.onOrderingDayChange).toHaveBeenCalledWith(null));
    });

    it('"Ordenar ejercicios" pasa el día a modo orden', async () => {
      const props = renderView();

      await userEvent.click(await menuItem('Opciones del lunes', 'Ordenar ejercicios'));

      expect(props.onOrderingDayChange).toHaveBeenCalledWith('d1');
    });

    it('en modo orden el resto de los días queda deshabilitado', () => {
      renderView({ orderingDayId: 'd1' });

      expect(screen.getByRole('button', { name: 'Opciones del miércoles' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Peso de Peso muerto: 60 kg' })).toBeDisabled();
    });

    it('guardar manda el día completo, avisa "Orden guardado" y sale del modo orden', async () => {
      const props = renderView({ orderingDayId: 'd1' });

      await userEvent.click(screen.getByRole('button', { name: 'Bajar Sentadilla' }));
      await userEvent.click(screen.getByRole('button', { name: 'Guardar orden' }));

      await waitFor(() => expect(mocks.exercises.reorderDay).toHaveBeenCalledWith('d1', ['e2', 'e1']));
      expect(mocks.notifySuccess).toHaveBeenCalledWith('Orden guardado');
      expect(props.onOrderingDayChange).toHaveBeenCalledWith(null);
    });

    it('un 409 muestra el aviso de lista desactualizada y "Recargar el día" vuelve a pedir el plan', async () => {
      mocks.exercises.reorderDay.mockRejectedValue(
        new ApiError('La lista no coincide con los ejercicios del día', 409)
      );
      mocks.failure.mockResolvedValue('conflict' satisfies GymWriteFailure);
      const props = renderView({ orderingDayId: 'd1' });

      await userEvent.click(screen.getByRole('button', { name: 'Bajar Sentadilla' }));
      await userEvent.click(screen.getByRole('button', { name: 'Guardar orden' }));

      expect(await screen.findByText('La lista no coincide con los ejercicios del día')).toBeInTheDocument();
      expect(props.onOrderingDayChange).not.toHaveBeenCalled();
      await userEvent.click(screen.getByRole('button', { name: 'Recargar el día' }));
      expect(mocks.plan.mutate).toHaveBeenCalled();
    });
  });
});
