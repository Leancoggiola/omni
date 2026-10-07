import { useEffect, useMemo } from 'react';
import useSWRImmutable from 'swr/immutable';

import { buildQueryString, SWR_KEYS } from '@/shared/api';

import { useToday } from '../useToday';

import type { TodayHolidays } from '@omni/shared/holidays';

/** Espera antes de reintentar cuando el servidor todavía responde con el día anterior. */
export const STALE_DAY_RETRY_MS = 30_000;

export function useTodayHolidays() {
  const dateKey = useToday();

  // `date` solo versiona la cache key: el servidor decide el día por su cuenta. Al cruzar la
  // medianoche la key cambia y SWR refetchea. Con keepPreviousData, `data` conserva el día
  // anterior mientras carga el nuevo (SWR igual marca `isLoading`, ver el return).
  // El provider global no reintenta errores: esta card no tiene botón "Reintentar", así que acá
  // se habilita un reintento acotado.
  const { data, isLoading, error, mutate } = useSWRImmutable<TodayHolidays>(
    `${SWR_KEYS.holidays.today}${buildQueryString({ date: dateKey })}`,
    { keepPreviousData: true, shouldRetryOnError: true, errorRetryCount: 3 }
  );

  // Reloj del cliente adelantado: la key ya es del día nuevo pero el servidor contestó con el
  // anterior. Como la key es immutable quedaría fija, así que se vuelve a pedir cada un rato hasta
  // que el servidor también cambie de día. Un timeout único no alcanza: si la respuesta repite el
  // día anterior, SWR conserva la misma referencia de `data` y nada lo re-dispararía.
  // Comparación de strings YYYY-MM-DD: con el reloj atrasado no hay nada que corregir.
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

  // En SWR 2 `isLoading` es true para la key nueva aunque keepPreviousData traiga el día
  // anterior en `data`: solo se considera "cargando" si no hay nada para mostrar.
  return { holidays: data ?? fallback, isLoading: isLoading && !data, error };
}
