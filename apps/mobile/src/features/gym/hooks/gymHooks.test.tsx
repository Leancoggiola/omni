import { act, renderHook, waitFor } from '@testing-library/react-native';
import { SWRConfig } from 'swr';

import { API_KEYS, ApiError } from '@/shared/api';

import { catalogExercise, exercise, planDetail, planSummary, weightEntry } from '../fixtures';
import { gymPlansKey } from '../utils/gymKeys';
import { useGymCatalogSuggestions } from './useGymCatalogSuggestions';
import { useGymMutations } from './useGymMutations';
import { useGymPlan } from './useGymPlan';
import { useGymPlans } from './useGymPlans';
import { useGymWeightHistory } from './useGymWeightHistory';
import { useGymWriteFailure } from './useGymWriteFailure';
import { useLastGymPlan } from './useLastGymPlan';

import type { ReactNode } from 'react';

const mockApi = { post: jest.fn(), patch: jest.fn(), put: jest.fn(), delete: jest.fn() };
const mockFetcher = jest.fn();
const mockReadLastPlan = jest.fn();
const mockSaveLastPlan = jest.fn();
let mockUsername: string | null = 'maria';

jest.mock('@/shared/api', () => ({
  ...jest.requireActual('@/shared/api/keys'),
  ApiError: jest.requireActual('@omni/shared/api').ApiError,
  readLastGymPlan: (username: string) => mockReadLastPlan(username),
  saveLastGymPlan: (username: string, planId: string | null) => mockSaveLastPlan(username, planId),
  fetcher: (key: string) => mockFetcher(key),
  api: {
    post: (...args: unknown[]) => mockApi.post(...args),
    patch: (...args: unknown[]) => mockApi.patch(...args),
    put: (...args: unknown[]) => mockApi.put(...args),
    delete: (...args: unknown[]) => mockApi.delete(...args),
  },
}));
jest.mock('@/core/auth', () => ({ useAuth: () => ({ user: mockUsername ? { username: mockUsername } : null }) }));

function wrapperWith(fetcher: jest.Mock) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <SWRConfig value={{ provider: () => new Map(), fetcher, dedupingInterval: 0 }}>{children}</SWRConfig>;
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUsername = 'maria';
  mockSaveLastPlan.mockResolvedValue(undefined);
});

afterEach(() => jest.useRealTimers());

describe('useGymPlans', () => {
  it('trae todas las páginas y las junta en una sola lista', async () => {
    mockFetcher
      .mockResolvedValueOnce({ items: [planSummary({ id: 'p1' })], total: 101, page: 1, limit: 100 })
      .mockResolvedValueOnce({ items: [planSummary({ id: 'p2' })], total: 101, page: 2, limit: 100 });
    const { result } = await renderHook(() => useGymPlans('ACTIVE'), { wrapper: wrapperWith(jest.fn()) });

    await waitFor(() => expect(result.current.plans).toHaveLength(2));
    expect(mockFetcher).toHaveBeenNthCalledWith(1, gymPlansKey('ACTIVE'));
    expect(mockFetcher).toHaveBeenNthCalledWith(2, gymPlansKey('ACTIVE', 2));
  });

  it('expone el error del fetch', async () => {
    mockFetcher.mockRejectedValue(new Error('Sin conexión'));
    const { result } = await renderHook(() => useGymPlans(), { wrapper: wrapperWith(jest.fn()) });

    await waitFor(() => expect(result.current.error).toEqual(new Error('Sin conexión')));
  });
});

describe('useGymPlan', () => {
  it('sin plan no pide nada y con plan pide su detalle', async () => {
    const fetcher = jest.fn().mockResolvedValue(planDetail());
    const wrapper = wrapperWith(fetcher);
    const { result, rerender } = await renderHook(({ id }: { id: string | null }) => useGymPlan(id), {
      wrapper,
      initialProps: { id: null },
    });
    expect(fetcher).not.toHaveBeenCalled();

    await rerender({ id: 'p1' });
    await waitFor(() => expect(result.current.plan?.name).toBe('Fuerza 3 días'));
    expect(fetcher).toHaveBeenCalledWith(API_KEYS.gym.plan('p1'));
  });
});

describe('useGymCatalogSuggestions', () => {
  it('busca desde 2 letras, a los 300 ms y pidiendo 20', async () => {
    jest.useFakeTimers({ advanceTimers: true });
    const fetcher = jest.fn().mockResolvedValue([catalogExercise()]);
    const { result, rerender } = await renderHook(({ q }: { q: string }) => useGymCatalogSuggestions(q), {
      wrapper: wrapperWith(fetcher),
      initialProps: { q: 'S' },
    });
    await act(async () => {
      await jest.advanceTimersByTimeAsync(500);
    });
    expect(fetcher).not.toHaveBeenCalled();
    expect(result.current.queried).toBe(false);

    await rerender({ q: 'Se' });
    expect(result.current.searching).toBe(true);
    await act(async () => {
      await jest.advanceTimersByTimeAsync(299);
    });
    expect(fetcher).not.toHaveBeenCalled();
    await act(async () => {
      await jest.advanceTimersByTimeAsync(2);
    });

    await waitFor(() => expect(result.current.suggestions).toHaveLength(1));
    expect(fetcher).toHaveBeenCalledWith(`${API_KEYS.gym.catalog}?limit=20&q=Se`);
    expect(result.current.searching).toBe(false);
  });

  it('si la búsqueda falla expone el error y no lista nada', async () => {
    jest.useFakeTimers({ advanceTimers: true });
    const fetcher = jest.fn().mockRejectedValue(new Error('x'));
    const { result } = await renderHook(() => useGymCatalogSuggestions('Sen'), {
      wrapper: wrapperWith(fetcher),
    });
    await act(async () => {
      await jest.advanceTimersByTimeAsync(400);
    });

    await waitFor(() => expect(result.current.error).toBeDefined());
    expect(result.current.suggestions).toEqual([]);
  });
});

describe('useGymWeightHistory', () => {
  const historyKey = (page: number) => `${API_KEYS.gym.exerciseWeightHistory('e1')}?limit=5&page=${page}`;

  it('pide de a 5 y loadMore trae la página siguiente hasta completar el total', async () => {
    const fetcher = jest
      .fn()
      .mockImplementation((key: string) =>
        Promise.resolve(
          key === historyKey(1)
            ? { items: [1, 2, 3, 4, 5].map(i => weightEntry({ id: `w${i}` })), total: 6, page: 1, limit: 5 }
            : { items: [weightEntry({ id: 'w6' })], total: 6, page: 2, limit: 5 }
        )
      );
    const { result } = await renderHook(() => useGymWeightHistory('e1'), { wrapper: wrapperWith(fetcher) });

    await waitFor(() => expect(result.current.entries).toHaveLength(5));
    expect(result.current.hasMore).toBe(true);

    await act(async () => result.current.loadMore());
    await waitFor(() => expect(result.current.entries).toHaveLength(6));
    expect(fetcher).toHaveBeenCalledWith(historyKey(2));
    expect(result.current.hasMore).toBe(false);

    await act(async () => result.current.loadMore());
    expect(fetcher).not.toHaveBeenCalledWith(historyKey(3));
  });

  it('sin ejercicio no pide nada', async () => {
    const fetcher = jest.fn();
    const { result } = await renderHook(() => useGymWeightHistory(null), { wrapper: wrapperWith(fetcher) });

    expect(result.current.entries).toEqual([]);
    expect(fetcher).not.toHaveBeenCalled();
  });
});

describe('useLastGymPlan', () => {
  it('lee el plan guardado de la persona y setLastPlan lo cambia y lo guarda', async () => {
    mockReadLastPlan.mockResolvedValue('p1');
    const { result } = await renderHook(() => useLastGymPlan(), { wrapper: wrapperWith(jest.fn()) });

    await waitFor(() => expect(result.current.lastPlanId).toBe('p1'));
    expect(mockReadLastPlan).toHaveBeenCalledWith('maria');

    await act(async () => result.current.setLastPlan('p2'));
    expect(result.current.lastPlanId).toBe('p2');
    expect(mockSaveLastPlan).toHaveBeenCalledWith('maria', 'p2');
  });

  it('sin sesión no hay plan guardado', async () => {
    mockUsername = null;
    const { result } = await renderHook(() => useLastGymPlan(), { wrapper: wrapperWith(jest.fn()) });

    expect(result.current.lastPlanId).toBeNull();
    expect(mockReadLastPlan).not.toHaveBeenCalled();
  });
});

describe('useGymMutations', () => {
  async function mutationsWithCache() {
    const fetcher = jest
      .fn()
      .mockImplementation((key: string) =>
        Promise.resolve(key === API_KEYS.gym.plan('p1') ? planDetail() : { items: [], total: 0, page: 1, limit: 100 })
      );
    const hook = await renderHook(
      () => ({ plan: useGymPlan('p1'), plansCache: useGymPlan('p2'), ...useGymMutations() }),
      { wrapper: wrapperWith(fetcher) }
    );
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
    fetcher.mockClear();
    return { fetcher, hook };
  }

  it('agregar un ejercicio manda el payload y revalida las keys del gimnasio', async () => {
    mockApi.post.mockResolvedValue(planDetail());
    const { fetcher, hook } = await mutationsWithCache();
    const payload = { planId: 'p1', weekday: 'MONDAY' as const, name: 'Sentadilla', sets: 4, reps: '12' };

    await act(async () => {
      await hook.result.current.addExercise(payload);
    });

    expect(mockApi.post).toHaveBeenCalledWith(API_KEYS.gym.exercises, payload);
    expect(fetcher).toHaveBeenCalledWith(API_KEYS.gym.plan('p1'));
    expect(fetcher).toHaveBeenCalledWith(API_KEYS.gym.plan('p2'));
  });

  it('editar manda nombre, series y repeticiones y mover solo el día', async () => {
    mockApi.patch.mockResolvedValue(planDetail());
    const { hook } = await mutationsWithCache();

    await act(async () => {
      await hook.result.current.updateExercise('e1', { name: 'Sentadilla', sets: null, reps: '12' });
      await hook.result.current.updateExercise('e1', { weekday: 'FRIDAY' });
    });

    expect(mockApi.patch).toHaveBeenNthCalledWith(1, API_KEYS.gym.exercise('e1'), {
      name: 'Sentadilla',
      sets: null,
      reps: '12',
    });
    expect(mockApi.patch).toHaveBeenNthCalledWith(2, API_KEYS.gym.exercise('e1'), { weekday: 'FRIDAY' });
  });

  it('cambiar de día usa el endpoint del día y borrar un día revalida el plan', async () => {
    mockApi.patch.mockResolvedValue(planDetail());
    mockApi.delete.mockResolvedValue(undefined);
    const { fetcher, hook } = await mutationsWithCache();

    await act(async () => {
      await hook.result.current.changeDay('d1', 'TUESDAY');
    });
    expect(mockApi.patch).toHaveBeenCalledWith(API_KEYS.gym.day('d1'), { weekday: 'TUESDAY' });

    fetcher.mockClear();
    await act(async () => {
      await hook.result.current.deleteDay('d1');
    });
    expect(mockApi.delete).toHaveBeenCalledWith(API_KEYS.gym.day('d1'));
    expect(fetcher).toHaveBeenCalledWith(API_KEYS.gym.plan('p1'));
  });

  it('cargar el peso usa el endpoint de peso', async () => {
    mockApi.patch.mockResolvedValue(exercise({ currentWeightKg: 62.5 }));
    const { fetcher, hook } = await mutationsWithCache();

    await act(async () => {
      await hook.result.current.updateWeight('e1', 62.5);
    });

    expect(mockApi.patch).toHaveBeenCalledWith(API_KEYS.gym.exerciseWeight('e1'), { weightKg: 62.5 });
    expect(fetcher).toHaveBeenCalledWith(API_KEYS.gym.plan('p1'));
  });

  it('reordenar manda la lista completa del día', async () => {
    mockApi.put.mockResolvedValue(planDetail());
    const { hook } = await mutationsWithCache();

    await act(async () => {
      await hook.result.current.reorderDay('d1', ['e2', 'e1']);
    });

    expect(mockApi.put).toHaveBeenCalledWith(API_KEYS.gym.dayExercisesOrder('d1'), { exerciseIds: ['e2', 'e1'] });
  });

  it('archivar, desarchivar, renombrar y crear usan sus endpoints', async () => {
    mockApi.post.mockResolvedValue(planDetail());
    mockApi.patch.mockResolvedValue(planDetail());
    const { hook } = await mutationsWithCache();

    await act(async () => {
      await hook.result.current.archivePlan('p1');
      await hook.result.current.unarchivePlan('p1');
      await hook.result.current.renamePlan('p1', 'Nuevo');
      await hook.result.current.createPlan('Otro');
    });

    expect(mockApi.post).toHaveBeenCalledWith(API_KEYS.gym.planArchive('p1'));
    expect(mockApi.post).toHaveBeenCalledWith(API_KEYS.gym.planUnarchive('p1'));
    expect(mockApi.patch).toHaveBeenCalledWith(API_KEYS.gym.plan('p1'), { name: 'Nuevo' });
    expect(mockApi.post).toHaveBeenCalledWith(API_KEYS.gym.plans, { name: 'Otro' });
  });

  it('borrar un plan no revalida su detalle (daría 404) pero sí el resto', async () => {
    mockApi.delete.mockResolvedValue(undefined);
    const { fetcher, hook } = await mutationsWithCache();

    await act(async () => {
      await hook.result.current.deletePlan('p1');
    });

    expect(mockApi.delete).toHaveBeenCalledWith(API_KEYS.gym.plan('p1'));
    expect(fetcher).not.toHaveBeenCalledWith(API_KEYS.gym.plan('p1'));
    expect(fetcher).toHaveBeenCalledWith(API_KEYS.gym.plan('p2'));
  });

  it('un error de la API se propaga y no revalida', async () => {
    mockApi.delete.mockRejectedValue(new Error('El plan está archivado'));
    const { fetcher, hook } = await mutationsWithCache();

    await expect(hook.result.current.removeExercise('e1')).rejects.toThrow('El plan está archivado');
    expect(fetcher).not.toHaveBeenCalled();
  });
});

describe('useGymWriteFailure', () => {
  async function setup(freshStatus: 'ACTIVE' | 'ARCHIVED') {
    const fetcher = jest
      .fn()
      .mockImplementation((key: string) =>
        Promise.resolve(
          key === API_KEYS.gym.plan('p1')
            ? planDetail({ status: freshStatus })
            : { items: [], total: 0, page: 1, limit: 100 }
        )
      );
    const hook = await renderHook(() => ({ plan: useGymPlan('p1'), fail: useGymWriteFailure('p1') }), {
      wrapper: wrapperWith(fetcher),
    });
    await waitFor(() => expect(hook.result.current.plan.plan).toBeDefined());
    return { fetcher, hook };
  }

  it('un 409 con el plan que vuelve archivado cierra la hoja con el aviso de la API', async () => {
    const { fetcher, hook } = await setup('ARCHIVED');
    fetcher.mockClear();

    let outcome: unknown;
    await act(async () => {
      outcome = await hook.result.current.fail(new ApiError('El plan está archivado', 409), 'No se pudo guardar');
    });

    expect(outcome).toEqual({ status: 'closed', notice: 'El plan está archivado' });
    expect(fetcher).toHaveBeenCalledWith(API_KEYS.gym.plan('p1'));
  });

  it('un 409 con el plan activo es un conflicto de formulario', async () => {
    const { hook } = await setup('ACTIVE');

    let outcome: unknown;
    await act(async () => {
      outcome = await hook.result.current.fail(new ApiError('El plan ya tiene ese día', 409), 'No se pudo cambiar');
    });

    expect(outcome).toEqual({ status: 'error', message: 'El plan ya tiene ese día', conflict: true });
  });

  it('un 404 cierra la hoja y vuelve a pedir el plan', async () => {
    const { fetcher, hook } = await setup('ACTIVE');
    fetcher.mockClear();

    let outcome: unknown;
    await act(async () => {
      outcome = await hook.result.current.fail(new ApiError('Ejercicio no encontrado', 404), 'No se pudo quitar');
    });

    expect(outcome).toEqual({ status: 'closed', notice: 'Ejercicio no encontrado' });
    expect(fetcher).toHaveBeenCalledWith(API_KEYS.gym.plan('p1'));
  });

  it('un error de red deja la hoja abierta con el texto de la acción', async () => {
    const { hook } = await setup('ACTIVE');

    let outcome: unknown;
    await act(async () => {
      outcome = await hook.result.current.fail(new Error('Failed to fetch'), 'No se pudo guardar el peso');
    });

    expect(outcome).toEqual({ status: 'error', message: 'No se pudo guardar el peso', conflict: false });
  });
});
