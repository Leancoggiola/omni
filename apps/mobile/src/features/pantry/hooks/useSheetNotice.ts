import { useCallback, useEffect, useRef } from 'react';

import { notifySuccess } from '@/shared/ui';

/**
 * Aviso de éxito de una hoja: mientras el `Modal` está visible tapa los toasts, así que se guarda al guardar y se
 * muestra en `flush` (el `onClosed` de la hoja). Si la pantalla se desmonta antes, igual se muestra.
 */
export function useSheetNotice() {
  const pending = useRef<string | null>(null);

  const flush = useCallback(() => {
    if (!pending.current) return;
    const message = pending.current;
    pending.current = null;
    notifySuccess(message);
  }, []);

  const queue = useCallback((message: string) => {
    pending.current = message;
  }, []);

  useEffect(() => flush, [flush]);

  return { queue, flush };
}
