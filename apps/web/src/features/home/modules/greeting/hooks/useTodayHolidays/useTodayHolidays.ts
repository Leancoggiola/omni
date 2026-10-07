import { useMemo } from 'react';
import useSWRImmutable from 'swr/immutable';

import { buildQueryString, SWR_KEYS } from '@/shared/api';

import { useToday } from '../useToday';

import type { TodayHolidays } from '@omni/shared/holidays';

export function useTodayHolidays() {
  const dateKey = useToday();

  // `date` solo versiona la cache key: el servidor decide el día por su cuenta. Al cruzar la
  // medianoche la key cambia y SWR refetchea; keepPreviousData evita el parpadeo de loading.
  const { data, isLoading, error } = useSWRImmutable<TodayHolidays>(
    `${SWR_KEYS.holidays.today}${buildQueryString({ date: dateKey })}`,
    { keepPreviousData: true }
  );

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

  return { holidays: data ?? fallback, isLoading, error };
}
