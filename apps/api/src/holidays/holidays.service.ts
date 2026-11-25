import { appDateKey } from '@omni/shared/common';
import { MAX_HOLIDAY_ITEMS } from '@omni/shared/holidays';
import type { Holiday, TodayHolidays, WikipediaHolidaysResponse } from '@omni/shared/holidays';

import { parseHolidayEntries } from './holidays.parser';
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
  const dateKey = appDateKey(now);
  const mm = dateKey.slice(5, 7);
  const dd = dateKey.slice(8, 10);
  return {
    dateKey,
    month: mm,
    day: dd,
    sourceUrl: `https://es.wikipedia.org/wiki/${Number(dd)}_de_${MONTH_NAMES_ES[Number(mm) - 1]}#Celebraciones`,
  };
}

/**
 * El feed es externo y no viene validado: un `holidays` que no es array cuenta como día sin efemérides.
 * Wikipedia repite la misma celebración en entradas distintas del día, así que se deduplica. El id es
 * posicional porque los títulos no son identificadores estables; de una entrada con varias efemérides, las que
 * siguen a la primera suman su posición.
 */
function mapHolidays(raw: WikipediaHolidaysResponse | null, parts: DateParts): TodayHolidays {
  const unique = new Map<string, Holiday>();

  const entries: unknown[] = Array.isArray(raw?.holidays) ? raw.holidays : [];

  for (const [index, entry] of entries.entries()) {
    const text = (entry as { text?: unknown } | null)?.text;
    if (typeof text !== 'string') continue;

    for (const [position, { title, isArgentina }] of parseHolidayEntries(text).entries()) {
      const key = title.toLowerCase();
      if (unique.has(key)) continue;

      const suffix = position === 0 ? '' : `-${position}`;
      unique.set(key, { id: `${parts.dateKey}-${index}${suffix}`, title, isArgentina });
    }
  }

  const items = [...unique.values()].slice(0, MAX_HOLIDAY_ITEMS);

  return {
    date: parts.dateKey,
    month: parts.month,
    day: parts.day,
    count: items.length,
    sourceUrl: parts.sourceUrl,
    items,
  };
}

/** Una respuesta tardía del día anterior no debe pisar el caché del día vigente. */
export async function getTodayHolidays(): Promise<TodayHolidays> {
  const parts = todayParts();

  if (cache?.dateKey === parts.dateKey) return cache.data;
  if (inFlight?.dateKey === parts.dateKey) return inFlight.promise;

  const promise = wikipediaService
    .fetchHolidays(parts.month, parts.day)
    .then(raw => {
      const data = mapHolidays(raw, parts);
      if (!cache || cache.dateKey <= parts.dateKey) {
        cache = { dateKey: parts.dateKey, data };
      }
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
