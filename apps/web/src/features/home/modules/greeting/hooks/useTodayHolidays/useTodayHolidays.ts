import { useEffect, useMemo } from 'react';
import useSWRImmutable from 'swr/immutable';

import { buildQueryString, SWR_KEYS } from '@/shared/api';

import { useToday } from '../useToday';

import type { TodayHolidays } from '@omni/shared/holidays';

/** Espera antes de reintentar cuando el servidor todavía responde con el día anterior. */
export const STALE_DAY_RETRY_MS = 30_000;

/**
 * `date` solo versiona la cache key: el servidor decide el día. Al cruzar la medianoche la key cambia y SWR
 * refetchea; con `keepPreviousData`, `data` conserva el día anterior mientras carga el nuevo, y como en SWR 2
 * `isLoading` es true igual, solo se considera "cargando" si no hay nada para mostrar. El provider global no
 * reintenta errores y la card no tiene botón "Reintentar", así que acá se habilita un reintento acotado.
 *
 * Con el reloj del cliente adelantado la key ya es del día nuevo pero el servidor contestó con el anterior.
 * Como la key es immutable quedaría fija: se vuelve a pedir cada `STALE_DAY_RETRY_MS` hasta que el servidor
 * también cambie de día (un timeout único no alcanza: SWR conserva la misma referencia de `data` y nada lo
 * re-dispararía). La comparación es de strings YYYY-MM-DD: con el reloj atrasado no hay nada que corregir.
 */
export function useTodayHolidays() {
  const dateKey = useToday();

  const { data, isLoading, error, mutate } = useSWRImmutable<TodayHolidays>(
    `${SWR_KEYS.holidays.today}${buildQueryString({ date: dateKey })}`,
    { keepPreviousData: true, shouldRetryOnError: true, errorRetryCount: 3 }
  );

  const isStaleDay = !isLoading && !error && !!data && data.date < dateKey;

  useEffect(() => {
    if (!isStaleDay) return;
    const interval = setInterval(() => void mutate(), STALE_DAY_RETRY_MS);
    return () => clearInterval(interval);
  }, [isStaleDay, mutate]);

  const fallback = useMemo<TodayHolidays>(
    () => ({
      date: dateKey,
      month: dateKey.slice(5, 7),
      day: dateKey.slice(8, 10),
      count: 0,
      sourceUrl: 'https://wikipedia.org',
      items: [],
    }),
    [dateKey]
  );

  return { holidays: data ?? fallback, isLoading: isLoading && !data, error };
}
