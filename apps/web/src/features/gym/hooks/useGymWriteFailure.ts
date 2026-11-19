import { useCallback } from 'react';
import { useSWRConfig } from 'swr';

import { SWR_KEYS } from '@/shared/api';
import { getErrorMessage, notifyError } from '@/shared/ui';

import { isGymKey } from '../utils/gymCache';

import type { GymPlanDetail } from '@omni/shared/gym';

import { ApiError } from '@omni/shared/api';

/**
 * Qué pasó con una escritura que falló: `archived` (el plan se archivó desde otro dispositivo: pasó a solo lectura),
 * `notFound` (el plan, el día o el ejercicio ya no existe), `conflict` (otro 409: la UI lo muestra dentro del
 * formulario) u `other` (red o error inesperado: el formulario queda abierto).
 */
export type GymWriteFailure = 'archived' | 'notFound' | 'conflict' | 'other';

/**
 * Clasifica el error de una escritura sobre un plan y hace lo que corresponde sin comparar textos: avisa con el
 * mensaje de la API (o el `fallback` de la acción) salvo en los conflictos de formulario, y vuelve a pedir el plan
 * ante un 404 o un 409 (y el listado, para que la cabecera tome el estado nuevo). Si tras un 409 el plan
 * vuelve archivado, no era un conflicto de formulario.
 */
export function useGymWriteFailure(planId: string) {
  const { mutate } = useSWRConfig();
  const planKey = SWR_KEYS.gym.plan(planId);

  const refreshList = useCallback(
    () => mutate((key: unknown) => isGymKey(key) && key !== planKey).catch(() => undefined),
    [mutate, planKey]
  );

  return useCallback(
    async (err: unknown, fallback: string): Promise<GymWriteFailure> => {
      const status = err instanceof ApiError ? err.status : 0;

      if (status === 404) {
        notifyError(getErrorMessage(err, fallback));
        await Promise.all([mutate(planKey).catch(() => undefined), refreshList()]);
        return 'notFound';
      }
      if (status === 409) {
        const [fresh] = await Promise.all([mutate<GymPlanDetail>(planKey).catch(() => undefined), refreshList()]);
        if (fresh?.status === 'ARCHIVED') {
          notifyError(getErrorMessage(err, fallback));
          return 'archived';
        }
        return 'conflict';
      }
      notifyError(getErrorMessage(err, fallback));
      return 'other';
    },
    [mutate, planKey, refreshList]
  );
}
