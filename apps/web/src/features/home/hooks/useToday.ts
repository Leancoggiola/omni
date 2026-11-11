import { useEffect, useState } from 'react';

import { appDateKey } from '@omni/shared/common';

const CHECK_INTERVAL_MS = 60_000;

/**
 * Día vigente (YYYY-MM-DD) en APP_TIMEZONE, el mismo criterio que usa la API.
 * Se actualiza solo al cruzar la medianoche: chequeo periódico + al volver a la pestaña
 * (los timers se frenan en segundo plano).
 */
export function useToday() {
  const [dateKey, setDateKey] = useState(() => appDateKey());

  useEffect(() => {
    const sync = () => setDateKey(appDateKey());
    const interval = setInterval(sync, CHECK_INTERVAL_MS);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') sync();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return dateKey;
}
