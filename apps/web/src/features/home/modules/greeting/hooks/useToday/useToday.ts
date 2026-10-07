import { useEffect, useState } from 'react';

import { APP_TIMEZONE, calendarPartsInTimeZone } from '@omni/shared/common';

const CHECK_INTERVAL_MS = 60_000;

function currentDateKey(now = new Date()) {
  const { year, month, day } = calendarPartsInTimeZone(now, APP_TIMEZONE);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Día vigente (YYYY-MM-DD) en APP_TIMEZONE, el mismo criterio que usa la API.
 * Se actualiza solo al cruzar la medianoche: chequeo periódico + al volver a la pestaña
 * (los timers se frenan en segundo plano).
 */
export function useToday() {
  const [dateKey, setDateKey] = useState(currentDateKey);

  useEffect(() => {
    const sync = () => setDateKey(currentDateKey());
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
