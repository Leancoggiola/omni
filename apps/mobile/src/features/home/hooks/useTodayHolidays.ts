import { useEffect, useMemo } from 'react';
import useSWRImmutable from 'swr/immutable';

import { API_KEYS, buildQueryString } from '@/shared/api';

import { useToday } from './useToday';

import type { TodayHolidays } from '@omni/shared/holidays';

/** Cada cuánto se vuelve a pedir mientras el servidor siga respondiendo con el día anterior. */
const STALE_DAY_RETRY_MS = 30_000;

export function useTodayHolidays() {
  const dateKey = useToday();

  // `date` solo versiona la cache key: el servidor decide el día por su cuenta. Al cruzar la
  // medianoche la key cambia y SWR refetchea. Con keepPreviousData, `data` conserva el día
  // anterior mientras carga el nuevo (SWR igual marca `isLoading`, ver el return).
  const { data, isLoading, error, mutate } = useSWRImmutable<TodayHolidays>(
    `${API_KEYS.holidays.today}${buildQueryString({ date: dateKey })}`,
    { keepPreviousData: true }
  );

  // Reloj del dispositivo adelantado: la key ya es del día nuevo pero el servidor contestó con el
  // anterior, y al ser immutable quedaría fija todo el día. Se reintenta cada 30 s hasta que el
  // servidor cruce la medianoche. Las fechas son YYYY-MM-DD, así que `<` compara bien; si el
  // dispositivo está atrasado (el servidor ya devuelve el día nuevo) no hay nada que corregir.
  const isStaleDay = !isLoading && !error && !!data && data.date < dateKey;

  useEffect(() => {
    if (!isStaleDay) return;
    // Intervalo y no timeout: si la respuesta no cambia, SWR conserva la misma referencia de
    // `data` y un timeout atado a ella no se volvería a programar.
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

  // En SWR 2 `isLoading` es true para la key nueva aunque keepPreviousData traiga el día
  // anterior en `data`: solo se considera "cargando" (skeleton) si no hay nada para mostrar.
  return { holidays: data ?? fallback, isLoading: isLoading && !data, error };
}
