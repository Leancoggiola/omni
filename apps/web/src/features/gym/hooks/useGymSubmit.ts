import { useCallback, useState } from 'react';

import type { GymSubmitResult } from '../utils/gymSubmit';

/**
 * Estado de envío de un formulario en modal: `loading` (para no cerrar el modal a mitad de camino) y `conflict` (el
 * mensaje de un 409 que se muestra dentro del formulario). `reset` limpia el aviso al cerrar.
 */
export function useGymSubmit<T>(onSubmit: (values: T) => Promise<GymSubmitResult>) {
  const [loading, setLoading] = useState(false);
  const [conflict, setConflict] = useState<string | null>(null);

  const submit = useCallback(
    async (values: T) => {
      if (loading) return;
      setLoading(true);
      setConflict(null);
      try {
        const result = await onSubmit(values);
        if (result.status === 'conflict') setConflict(result.message);
      } finally {
        setLoading(false);
      }
    },
    [loading, onSubmit]
  );

  const reset = useCallback(() => setConflict(null), []);

  return { loading, conflict, submit, reset };
}
