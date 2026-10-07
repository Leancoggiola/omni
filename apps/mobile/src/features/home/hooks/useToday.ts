import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { appDateKey } from '@omni/shared/common';

const CHECK_INTERVAL_MS = 60_000;

/**
 * Día vigente (YYYY-MM-DD) en APP_TIMEZONE, el mismo criterio que usa la API.
 * Se actualiza solo al cruzar la medianoche: chequeo periódico + al volver a primer plano
 * (los timers se frenan con la app en segundo plano).
 */
export function useToday() {
  const [dateKey, setDateKey] = useState(() => appDateKey());

  useEffect(() => {
    const sync = () => setDateKey(appDateKey());
    const interval = setInterval(sync, CHECK_INTERVAL_MS);
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') sync();
    });

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, []);

  return dateKey;
}
