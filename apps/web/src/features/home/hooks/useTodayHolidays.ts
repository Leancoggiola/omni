import { useEffect, useMemo } from 'react';
import useSWRImmutable from 'swr/immutable';

import { buildQueryString, SWR_KEYS } from '@/shared/api';

import { useToday } from './useToday';

import type { TodayHolidays } from '@omni/shared/holidays';

import { emptyTodayHolidays, HOLIDAY_STALE_DAY_RETRY_MS, isStaleHolidayDay } from '@omni/shared/holidays';

/**
 * `date` solo versiona la cache key: el servidor decide el día. Al cruzar la medianoche la key cambia y SWR
 * refetchea; con `keepPreviousData`, `data` conserva el día anterior mientras carga el nuevo, y como en SWR 2
 * `isLoading` es true igual, solo se considera "cargando" si no hay nada para mostrar. Los errores siguen la política
 * de reintentos global (`SWRProvider`) y la card ofrece además "Reintentar" a mano.
 *
 * Si el servidor contestó con el día anterior (`isStaleHolidayDay`), como la key es immutable quedaría fija: se
 * vuelve a pedir cada `HOLIDAY_STALE_DAY_RETRY_MS` hasta que el servidor también cambie de día (un timeout único no
 * alcanza: SWR conserva la misma referencia de `data` y nada lo re-dispararía).
 */
export function useTodayHolidays() {
  const dateKey = useToday();

  const { data, isLoading, error, mutate } = useSWRImmutable<TodayHolidays>(
    `${SWR_KEYS.holidays.today}${buildQueryString({ date: dateKey })}`,
    { keepPreviousData: true }
  );

  const isStaleDay = !isLoading && !error && !!data && isStaleHolidayDay(data, dateKey);

  useEffect(() => {
    if (!isStaleDay) return;
    const interval = setInterval(() => void mutate(), HOLIDAY_STALE_DAY_RETRY_MS);
    return () => clearInterval(interval);
  }, [isStaleDay, mutate]);

  const fallback = useMemo(() => emptyTodayHolidays(dateKey), [dateKey]);

  return { holidays: data ?? fallback, isLoading: isLoading && !data, error, mutate };
}
