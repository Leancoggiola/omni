import { useCallback, useRef, useState } from 'react';

import type { GymSubmitResult } from '../utils/gymSubmit';

type SheetError = { message: string; conflict: boolean };

/**
 * Envío de un formulario en hoja: `submitting` (la hoja no se cierra a mitad de camino) y `error` (el mensaje que se
 * muestra en un `Banner` adentro: con la hoja visible los toasts quedan tapados). `run` manda `values`; si sale bien
 * o la pantalla resuelve `closed` llama a `close`, y si hay un error la hoja queda abierta con lo cargado. El guard
 * contra el doble envío es un ref síncrono.
 */
export function useGymSheetSubmit<T>(submit: (values: T) => Promise<GymSubmitResult>, close: () => void) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<SheetError | null>(null);
  const busy = useRef(false);

  const run = useCallback(
    async (values: T) => {
      if (busy.current) return;
      busy.current = true;
      setSubmitting(true);
      setError(null);
      try {
        const result = await submit(values);
        if (result.status === 'error') setError({ message: result.message, conflict: result.conflict });
        else close();
      } finally {
        busy.current = false;
        setSubmitting(false);
      }
    },
    [submit, close]
  );

  return { submitting, error, run };
}
