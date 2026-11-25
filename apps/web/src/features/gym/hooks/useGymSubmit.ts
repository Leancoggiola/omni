import { useCallback, useRef, useState } from 'react';

import type { GymSubmitResult } from '../utils/gymSubmit';

/**
 * Estado de envío de un formulario en modal: `loading` (para no cerrar el modal a mitad de camino; el guard
 * contra el doble envío es un ref síncrono) y `conflict` (el mensaje de un 409 que se muestra dentro del
 * formulario). `reset` limpia el aviso al cerrar.
 */
export function useGymSubmit<T>(onSubmit: (values: T) => Promise<GymSubmitResult>) {
  const [loading, setLoading] = useState(false);
  const [conflict, setConflict] = useState<string | null>(null);
  const busy = useRef(false);

  const submit = useCallback(
    async (values: T) => {
      if (busy.current) return;
      busy.current = true;
      setLoading(true);
      setConflict(null);
      try {
        const result = await onSubmit(values);
        if (result.status === 'conflict') setConflict(result.message);
      } finally {
        busy.current = false;
        setLoading(false);
      }
    },
    [onSubmit]
  );

  const reset = useCallback(() => setConflict(null), []);

  return { loading, conflict, submit, reset };
}
