import { isGymKey } from '@omni/shared/gym';

import { useCallback } from 'react';
import { useSWRConfig } from 'swr';

import { API_KEYS, ApiError } from '@/shared/api';
import { getErrorMessage } from '@/shared/ui';

import type { GymPlanDetail } from '@omni/shared/gym';

export type GymFailure = { status: 'closed'; notice: string } | { status: 'error'; message: string; conflict: boolean };

/**
 * Qué hacer con una escritura que falló sobre un plan, sin comparar textos: un 404 (el plan, el día o el ejercicio ya
 * no existe) o un 409 con el plan que vuelve archivado cierran la hoja (`closed`, con el aviso del error), y vuelven a
 * pedir el plan y el listado; otro 409 es un conflicto de formulario y la red u otro error dejan la hoja abierta (ambos
 * `error`, con el mensaje de la API o el `fallback` de la acción).
 */
export function useGymWriteFailure(planId: string | null) {
  const { mutate } = useSWRConfig();
  const planKey = planId ? API_KEYS.gym.plan(planId) : null;

  const refreshList = useCallback(
    () => mutate((key: unknown) => isGymKey(key) && key !== planKey).catch(() => undefined),
    [mutate, planKey]
  );

  return useCallback(
    async (err: unknown, fallback: string): Promise<GymFailure> => {
      const message = getErrorMessage(err, fallback);
      const status = err instanceof ApiError ? err.status : 0;

      if (status === 404) {
        await Promise.all([planKey ? mutate(planKey).catch(() => undefined) : undefined, refreshList()]);
        return { status: 'closed', notice: message };
      }
      if (status === 409) {
        const [fresh] = await Promise.all([
          planKey ? mutate<GymPlanDetail>(planKey).catch(() => undefined) : undefined,
          refreshList(),
        ]);
        if (fresh?.status === 'ARCHIVED') return { status: 'closed', notice: message };
        return { status: 'error', message, conflict: true };
      }
      return { status: 'error', message, conflict: false };
    },
    [mutate, planKey, refreshList]
  );
}
