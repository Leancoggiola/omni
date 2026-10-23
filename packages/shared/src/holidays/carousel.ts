import type { TodayHolidays } from './types';

export const HOLIDAY_CAROUSEL_DURATION_MS = 3_000;

export const HOLIDAY_STALE_DAY_RETRY_MS = 30_000;

/** Índice válido del carrusel aunque la lista haya cambiado de largo (0 con la lista vacía). */
export function clampCarouselIndex(index: number, count: number): number {
  return count ? index % count : 0;
}

/** Índice siguiente del carrusel, circular: después del último vuelve al primero. */
export function nextCarouselIndex(index: number, count: number): number {
  return count === 0 ? 0 : (clampCarouselIndex(index, count) + 1) % count;
}

/**
 * Con el reloj del cliente adelantado la key ya es del día nuevo pero el servidor contestó con el anterior: hay que
 * volver a pedir cada `HOLIDAY_STALE_DAY_RETRY_MS`. La comparación es de strings YYYY-MM-DD: con el reloj atrasado no
 * hay nada que corregir.
 */
export function isStaleHolidayDay(holidays: Pick<TodayHolidays, 'date'>, dateKey: string): boolean {
  return holidays.date < dateKey;
}

/** Efemérides vacías de `dateKey` (YYYY-MM-DD), para mostrar mientras no hay respuesta del servidor. */
export function emptyTodayHolidays(dateKey: string): TodayHolidays {
  return {
    date: dateKey,
    month: dateKey.slice(5, 7),
    day: dateKey.slice(8, 10),
    count: 0,
    sourceUrl: 'https://wikipedia.org',
    items: [],
  };
}
