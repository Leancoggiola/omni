import { APP_TIMEZONE, calendarPartsInTimeZone } from '@omni/shared/common';
import { MAX_HOLIDAY_ITEMS } from '@omni/shared/holidays';
import type { Holiday, TodayHolidays, WikipediaHolidaysResponse } from '@omni/shared/holidays';

import { parseHolidayEntry } from './holidays.parser';
import * as wikipediaService from './wikipedia.service';

const MONTH_NAMES_ES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

interface DateParts {
  dateKey: string;
  month: string;
  day: string;
  sourceUrl: string;
}

/**
 * Caché de un solo slot: las efemérides cambian una vez por día, así que alcanza con guardar
 * el día vigente. Cuando cambia la fecha el dateKey deja de matchear y se refetchea solo,
 * sin timers ni TTL. Los errores no se cachean.
 */
let cache: { dateKey: string; data: TodayHolidays } | null = null;
/** Deduplica requests concurrentes: N llamadas simultáneas disparan un solo fetch a Wikipedia. */
let inFlight: { dateKey: string; promise: Promise<TodayHolidays> } | null = null;

function todayParts(now = new Date()): DateParts {
  const { year, month, day } = calendarPartsInTimeZone(now, APP_TIMEZONE);
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return {
    dateKey: `${year}-${mm}-${dd}`,
    month: mm,
    day: dd,
    sourceUrl: `https://es.wikipedia.org/wiki/${day}_de_${MONTH_NAMES_ES[month - 1]}#Celebraciones`,
  };
}

function mapHolidays(raw: WikipediaHolidaysResponse, parts: DateParts): TodayHolidays {
  const items: Holiday[] = [];
  const seen = new Set<string>();

  for (const [index, entry] of (raw.holidays ?? []).entries()) {
    if (typeof entry.text !== 'string') continue;

    const parsed = parseHolidayEntry(entry.text);
    if (!parsed) continue;

    // Wikipedia repite la misma celebración en entradas distintas dentro del mismo día.
    const key = parsed.title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    items.push({
      // El id es posicional porque los títulos no son identificadores estables.
      id: `${parts.dateKey}-${index}`,
      title: parsed.title,
      isArgentina: parsed.isArgentina,
    });

    if (items.length === MAX_HOLIDAY_ITEMS) break;
  }

  return {
    date: parts.dateKey,
    month: parts.month,
    day: parts.day,
    count: items.length,
    sourceUrl: parts.sourceUrl,
    items,
  };
}

export async function getTodayHolidays(): Promise<TodayHolidays> {
  const parts = todayParts();

  if (cache?.dateKey === parts.dateKey) return cache.data;
  if (inFlight?.dateKey === parts.dateKey) return inFlight.promise;

  const promise = wikipediaService
    .fetchHolidays(parts.month, parts.day)
    .then(raw => {
      const data = mapHolidays(raw, parts);
      cache = { dateKey: parts.dateKey, data };
      return data;
    })
    .finally(() => {
      if (inFlight?.dateKey === parts.dateKey) inFlight = null;
    });

  inFlight = { dateKey: parts.dateKey, promise };
  return promise;
}

/** Solo para tests: el caché es estado de módulo y sobrevive entre casos. */
export function resetHolidaysCache(): void {
  cache = null;
  inFlight = null;
}
