import { useEffect, useMemo } from 'react';
import useSWRImmutable from 'swr/immutable';

import { API_KEYS, buildQueryString } from '@/shared/api';

import { useToday } from './useToday';

import { emptyTodayHolidays, HOLIDAY_STALE_DAY_RETRY_MS, isStaleHolidayDay } from '@omni/shared/holidays';

import type { TodayHolidays } from '@omni/shared/holidays';

/**
 * Efemérides del día (= `useTodayHolidays` de web): `date` versiona la key y, si el servidor contestó con el día
 * anterior (`isStaleHolidayDay`), se vuelve a pedir cada `HOLIDAY_STALE_DAY_RETRY_MS` hasta que también cambie.
 */
export function useTodayHolidays() {
  const dateKey = useToday();

  const { data, isLoading, error, mutate } = useSWRImmutable<TodayHolidays>(
    `${API_KEYS.holidays.today}${buildQueryString({ date: dateKey })}`,
    { keepPreviousData: true }
  );

  const isStaleDay = !isLoading && !error && !!data && isStaleHolidayDay(data, dateKey);

  useEffect(() => {
    if (!isStaleDay) return;
    const interval = setInterval(() => void mutate(), HOLIDAY_STALE_DAY_RETRY_MS);
    return () => clearInterval(interval);
  }, [isStaleDay, mutate]);

  const fallback = useMemo(() => emptyTodayHolidays(dateKey), [dateKey]);

  return { holidays: data ?? fallback, isLoading: isLoading && !data, error, retry: () => void mutate() };
}
