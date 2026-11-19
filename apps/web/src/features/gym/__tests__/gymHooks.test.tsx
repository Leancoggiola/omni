import useSWR, { SWRConfig, useSWRConfig } from 'swr';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError, SWR_KEYS } from '@/shared/api';

import { useGymCatalog } from '../hooks/useGymCatalog';
import { useGymDayMutations } from '../hooks/useGymDayMutations';
import { useGymExerciseMutations } from '../hooks/useGymExerciseMutations';
import { useGymPlan } from '../hooks/useGymPlan';
import { useGymPlanMutations } from '../hooks/useGymPlanMutations';
import { useGymPlans } from '../hooks/useGymPlans';
import { useGymWeightHistory } from '../hooks/useGymWeightHistory';
import { useGymWriteFailure } from '../hooks/useGymWriteFailure';
import { day, exercise, planDetail, planSummary } from './fixtures';

import type { GymPlanDetail } from '@omni/shared/gym';
import type { ReactNode } from 'react';

import { act, renderHook, waitFor } from '@testing-library/react';

const post = vi.fn();
const patch = vi.fn();
const put = vi.fn();
const del = vi.fn();
const fetcher = vi.fn();
const notifyError = vi.fn();

vi.mock('@/shared/ui', async importOriginal => ({
  ...(await importOriginal<typeof import('@/shared/ui')>()),
  notifyError: (...args: unknown[]) => notifyError(...args),
}));

vi.mock('@/shared/api', async importOriginal => ({
  ...(await importOriginal<typeof import('@/shared/api')>()),
  fetcher: (...args: unknown[]) => fetcher(...args),
  api: {
    post: (...args: unknown[]) => post(...args),
    patch: (...args: unknown[]) => patch(...args),
    put: (...args: unknown[]) => put(...args),
    delete: (...args: unknown[]) => del(...args),
  },
}));

function wrapper({ children }: { children: ReactNode }) {
  return (
    <SWRConfig value={{ provider: () => new Map(), fetcher, dedupingInterval: 0, revalidateOnFocus: false }}>
      {children}
    </SWRConfig>
  );
}

const PLAN_KEY = SWR_KEYS.gym.plan('plan1');
const twoExercisePlan = () =>
  planDetail({ days: [day({ exercises: [exercise(), exercise({ id: 'e2', catalogId: 'c2', name: 'Remo' })] })] });

/** Fetcher por key: el detalle del plan y una lista vacía para el resto. */
function serve(plan: GymPlanDetail) {
  fetcher.mockImplementation((key: string) =>
    Promise.resolve(key === PLAN_KEY ? plan : { items: [], total: 0, page: 1, limit: 100 })
  );
}

describe('hooks del gimnasio', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('useGymPlans pide la página más grande y junta todas las páginas', async () => {
    const page = (id: string) => ({ items: [planSummary({ id })], total: 101, page: 1, limit: 100 });
    fetcher.mockResolvedValueOnce(page('plan1')).mockResolvedValueOnce(page('plan2'));
    const { result } = renderHook(() => useGymPlans(), { wrapper });

    await waitFor(() => expect(result.current.plans?.map(plan => plan.id)).toEqual(['plan1', 'plan2']));
    expect(fetcher).toHaveBeenNthCalledWith(1, `${SWR_KEYS.gym.plans}?limit=100`);
    expect(fetcher).toHaveBeenNthCalledWith(2, `${SWR_KEYS.gym.plans}?limit=100&page=2`);
  });

  it('useGymPlan no pide nada sin plan', () => {
    renderHook(() => useGymPlan(null), { wrapper });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('crear un plan guarda el detalle en su key sin pedirlo y revalida el listado', async () => {
    const created = planDetail({ id: 'plan2', days: [] });
    post.mockResolvedValue(created);
    fetcher.mockResolvedValue({ items: [planSummary()], total: 1, page: 1, limit: 100 });
    const { result } = renderHook(
      () => ({ plans: useGymPlans(), mutations: useGymPlanMutations(), config: useSWRConfig() }),
      { wrapper }
    );
    await waitFor(() => expect(result.current.plans.plans).toBeDefined());
    fetcher.mockClear();

    await act(async () => {
      await result.current.mutations.createPlan({ name: 'Hipertrofia' });
    });

    expect(post).toHaveBeenCalledWith(SWR_KEYS.gym.plans, { name: 'Hipertrofia' });
    expect(result.current.config.cache.get(SWR_KEYS.gym.plan('plan2'))?.data).toEqual(created);
    expect(fetcher).toHaveBeenCalledWith(`${SWR_KEYS.gym.plans}?limit=100`);
    expect(fetcher).not.toHaveBeenCalledWith(SWR_KEYS.gym.plan('plan2'));
  });

  it('archivar, desarchivar, renombrar y borrar llaman a sus endpoints', async () => {
    post.mockResolvedValue(planDetail());
    patch.mockResolvedValue(planDetail());
    del.mockResolvedValue(undefined);
    const { result } = renderHook(() => useGymPlanMutations(), { wrapper });

    await act(async () => {
      await result.current.archivePlan('plan1');
      await result.current.unarchivePlan('plan1');
      await result.current.renamePlan('plan1', { name: 'Nuevo' });
      await result.current.deletePlan('plan1');
    });

    expect(post).toHaveBeenCalledWith(SWR_KEYS.gym.planArchive('plan1'));
    expect(post).toHaveBeenCalledWith(SWR_KEYS.gym.planUnarchive('plan1'));
    expect(patch).toHaveBeenCalledWith(SWR_KEYS.gym.plan('plan1'), { name: 'Nuevo' });
    expect(del).toHaveBeenCalledWith(SWR_KEYS.gym.plan('plan1'));
  });

  it('cargar peso actualiza en el plan todas las filas de la variante', async () => {
    const plan = planDetail({
      days: [day(), day({ id: 'd2', weekday: 'FRIDAY', exercises: [exercise({ id: 'e3' })] })],
    });
    serve(plan);
    patch.mockResolvedValue(exercise({ currentWeightKg: 62.5 }));
    const { result } = renderHook(() => ({ plan: useGymPlan('plan1'), mutations: useGymExerciseMutations('plan1') }), {
      wrapper,
    });
    await waitFor(() => expect(result.current.plan.plan).toBeDefined());

    await act(async () => {
      await result.current.mutations.updateWeight('e1', 62.5);
    });

    expect(patch).toHaveBeenCalledWith(SWR_KEYS.gym.exerciseWeight('e1'), { weightKg: 62.5 });
    const weights = result.current.plan.plan!.days.map(d => d.exercises[0]!.currentWeightKg);
    expect(weights).toEqual([62.5, 62.5]);
  });

  it('reordenar manda la lista completa y guarda el plan que devuelve la API (sin update optimista)', async () => {
    const plan = twoExercisePlan();
    serve(plan);
    const reordered = planDetail({
      days: [
        day({
          exercises: [exercise({ id: 'e2', catalogId: 'c2', name: 'Remo', sortOrder: 0 }), exercise({ sortOrder: 1 })],
        }),
      ],
    });
    put.mockResolvedValue(reordered);
    const { result } = renderHook(() => ({ plan: useGymPlan('plan1'), mutations: useGymExerciseMutations('plan1') }), {
      wrapper,
    });
    await waitFor(() => expect(result.current.plan.plan).toBeDefined());

    await act(async () => {
      await result.current.mutations.reorderDay('d1', ['e2', 'e1']);
    });

    expect(put).toHaveBeenCalledWith(SWR_KEYS.gym.dayExercisesOrder('d1'), { exerciseIds: ['e2', 'e1'] });
    expect(result.current.plan.plan!.days[0]!.exercises.map(e => e.id)).toEqual(['e2', 'e1']);
  });

  it('si reordenar falla propaga el error y no toca el plan', async () => {
    serve(twoExercisePlan());
    put.mockRejectedValue(new Error('La lista no coincide con los ejercicios del día'));
    const { result } = renderHook(() => ({ plan: useGymPlan('plan1'), mutations: useGymExerciseMutations('plan1') }), {
      wrapper,
    });
    await waitFor(() => expect(result.current.plan.plan).toBeDefined());

    await act(async () => {
      await expect(result.current.mutations.reorderDay('d1', ['e2', 'e1'])).rejects.toThrow('La lista no coincide');
    });

    expect(result.current.plan.plan!.days[0]!.exercises.map(e => e.id)).toEqual(['e1', 'e2']);
  });

  it('editar manda nombre, series y repeticiones (series vacías como null) y mover manda solo el día', async () => {
    serve(planDetail());
    patch.mockResolvedValue(planDetail({ name: 'Con cambios' }));
    const { result } = renderHook(() => ({ plan: useGymPlan('plan1'), mutations: useGymExerciseMutations('plan1') }), {
      wrapper,
    });
    await waitFor(() => expect(result.current.plan.plan).toBeDefined());

    await act(async () => {
      await result.current.mutations.updateExercise('e1', { name: 'Sentadilla', sets: null, reps: '12' });
      await result.current.mutations.moveExercise('e1', 'FRIDAY');
    });

    expect(patch).toHaveBeenNthCalledWith(1, SWR_KEYS.gym.exercise('e1'), {
      name: 'Sentadilla',
      sets: null,
      reps: '12',
    });
    expect(patch).toHaveBeenNthCalledWith(2, SWR_KEYS.gym.exercise('e1'), { weekday: 'FRIDAY' });
    expect(result.current.plan.plan!.name).toBe('Con cambios');
  });

  it('cargar peso revalida el historial del ejercicio y el catálogo', async () => {
    serve(planDetail());
    patch.mockResolvedValue(exercise({ currentWeightKg: 62.5 }));
    const history = `${SWR_KEYS.gym.exerciseWeightHistory('e1')}?limit=5&page=1`;
    const catalog = `${SWR_KEYS.gym.catalog}?limit=20&q=sen`;
    const { result } = renderHook(
      () => ({
        plan: useGymPlan('plan1'),
        history: useSWR(history),
        catalog: useSWR(catalog),
        mutations: useGymExerciseMutations('plan1'),
      }),
      { wrapper }
    );
    await waitFor(() => expect(result.current.catalog.data).toBeDefined());
    fetcher.mockClear();

    await act(async () => {
      await result.current.mutations.updateWeight('e1', 62.5);
    });

    expect(fetcher).toHaveBeenCalledWith(history);
    expect(fetcher).toHaveBeenCalledWith(catalog);
  });

  it('cambiar de día manda el día nuevo y borrar un día revalida el plan', async () => {
    const plan = planDetail();
    serve(plan);
    patch.mockResolvedValue(planDetail({ days: [day({ weekday: 'TUESDAY' })] }));
    del.mockResolvedValue(undefined);
    const { result } = renderHook(() => ({ plan: useGymPlan('plan1'), mutations: useGymDayMutations('plan1') }), {
      wrapper,
    });
    await waitFor(() => expect(result.current.plan.plan).toBeDefined());

    await act(async () => {
      await result.current.mutations.changeDay('d1', 'TUESDAY');
    });
    expect(patch).toHaveBeenCalledWith(SWR_KEYS.gym.day('d1'), { weekday: 'TUESDAY' });
    expect(result.current.plan.plan!.days[0]!.weekday).toBe('TUESDAY');

    fetcher.mockClear();
    await act(async () => {
      await result.current.mutations.deleteDay('d1');
    });
    expect(del).toHaveBeenCalledWith(SWR_KEYS.gym.day('d1'));
    expect(fetcher).toHaveBeenCalledWith(PLAN_KEY);
  });

  describe('catálogo e historial', () => {
    afterEach(() => vi.useRealTimers());

    it('el catálogo busca desde 2 letras, a los 300 ms y pidiendo 20', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      fetcher.mockResolvedValue([]);
      const { result, rerender } = renderHook(({ query }) => useGymCatalog(query), {
        wrapper,
        initialProps: { query: 'S' },
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(500);
      });
      expect(fetcher).not.toHaveBeenCalled();
      expect(result.current.queried).toBe(false);

      rerender({ query: 'Se' });
      expect(result.current.searching).toBe(true);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(299);
      });
      expect(fetcher).not.toHaveBeenCalled();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2);
      });
      await waitFor(() => expect(fetcher).toHaveBeenCalledWith(`${SWR_KEYS.gym.catalog}?limit=20&q=Se`));
      await waitFor(() => expect(result.current.searching).toBe(false));
    });

    it('el historial pide de a 5 por página y no pide nada si está deshabilitado', () => {
      fetcher.mockResolvedValue({ items: [], total: 0, page: 1, limit: 5 });
      renderHook(() => useGymWeightHistory('e1', 2), { wrapper });
      renderHook(() => useGymWeightHistory('e9', 3, false), { wrapper });

      expect(fetcher).toHaveBeenCalledWith(`${SWR_KEYS.gym.exerciseWeightHistory('e1')}?limit=5&page=2`);
      expect(fetcher).toHaveBeenCalledTimes(1);
    });
  });

  describe('useGymWriteFailure', () => {
    const setup = async (fresh: GymPlanDetail) => {
      serve(fresh);
      const hook = renderHook(
        () => ({ plan: useGymPlan('plan1'), plans: useGymPlans(), fail: useGymWriteFailure('plan1') }),
        { wrapper }
      );
      await waitFor(() => expect(hook.result.current.plan.plan).toBeDefined());
      return hook;
    };

    it('un 409 con el plan que al volver a pedirlo está archivado avisa y dice archived', async () => {
      const { result } = await setup(planDetail());
      serve(planDetail({ status: 'ARCHIVED' }));
      fetcher.mockClear();
      serve(planDetail({ status: 'ARCHIVED' }));

      let outcome: string | undefined;
      await act(async () => {
        outcome = await result.current.fail(new ApiError('El plan está archivado', 409), 'No se pudo guardar');
      });

      expect(outcome).toBe('archived');
      expect(fetcher).toHaveBeenCalledWith(PLAN_KEY);
      expect(fetcher).toHaveBeenCalledWith(`${SWR_KEYS.gym.plans}?limit=100`);
      expect(notifyError).toHaveBeenCalledWith('El plan está archivado');
    });

    it('un 409 con el plan activo es un conflicto de formulario y no avisa', async () => {
      const { result } = await setup(planDetail());

      let outcome: string | undefined;
      await act(async () => {
        outcome = await result.current.fail(new ApiError('El ejercicio ya está en ese día', 409), 'No se pudo mover');
      });

      expect(outcome).toBe('conflict');
      expect(notifyError).not.toHaveBeenCalled();
    });

    it('un 404 avisa con el texto de la API y vuelve a pedir el plan', async () => {
      const { result } = await setup(planDetail());
      fetcher.mockClear();

      let outcome: string | undefined;
      await act(async () => {
        outcome = await result.current.fail(new ApiError('Ejercicio no encontrado', 404), 'No se pudo quitar');
      });

      expect(outcome).toBe('notFound');
      expect(notifyError).toHaveBeenCalledWith('Ejercicio no encontrado');
      expect(fetcher).toHaveBeenCalledWith(PLAN_KEY);
    });

    it('un error de red avisa con el texto de la acción y deja el formulario abierto', async () => {
      const { result } = await setup(planDetail());

      let outcome: string | undefined;
      await act(async () => {
        outcome = await result.current.fail(new Error('Failed to fetch'), 'No se pudo guardar el peso');
      });

      expect(outcome).toBe('other');
      expect(notifyError).toHaveBeenCalledWith('No se pudo guardar el peso');
    });
  });

  it('agregar guarda el plan devuelto y borrar vuelve a pedirlo', async () => {
    const plan = planDetail();
    serve(plan);
    const withNew = twoExercisePlan();
    post.mockResolvedValue(withNew);
    del.mockResolvedValue(undefined);
    const { result } = renderHook(() => ({ plan: useGymPlan('plan1'), mutations: useGymExerciseMutations('plan1') }), {
      wrapper,
    });
    await waitFor(() => expect(result.current.plan.plan).toBeDefined());

    await act(async () => {
      await result.current.mutations.addExercise({
        planId: 'plan1',
        weekday: 'MONDAY',
        name: 'Remo',
        sets: 3,
        reps: '10',
      });
    });
    expect(post).toHaveBeenCalledWith(SWR_KEYS.gym.exercises, expect.objectContaining({ name: 'Remo' }));
    expect(result.current.plan.plan).toEqual(withNew);

    fetcher.mockClear();
    await act(async () => {
      await result.current.mutations.deleteExercise('e2');
    });
    expect(del).toHaveBeenCalledWith(SWR_KEYS.gym.exercise('e2'));
    expect(fetcher).toHaveBeenCalledWith(PLAN_KEY);
  });

  it('un fallo del write se propaga para que la UI lo muestre', async () => {
    patch.mockRejectedValue(new Error('El plan está archivado'));
    const { result } = renderHook(() => useGymExerciseMutations('plan1'), { wrapper });

    await expect(result.current.updateWeight('e1', 70)).rejects.toThrow('El plan está archivado');
  });
});
