import { useEffect, useMemo } from 'react';
import useSWRImmutable from 'swr/immutable';

import { buildQueryString, SWR_KEYS } from '@/shared/api';

import { useToday } from '../useToday';

import type { TodayHolidays } from '@omni/shared/holidays';

/** Espera antes de reintentar cuando el servidor todavía responde con el día anterior. */
export const STALE_DAY_RETRY_MS = 30_000;

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
