import { APP_TIMEZONE, calendarPartsInTimeZone } from '@omni/shared/common';
import { GYM_WEEKDAY_LABELS } from '@omni/shared/gym';

import type { GymWeekday } from '@omni/shared/gym';

const COUNTED_REPS = /^\d+(\s*-\s*\d+)?$/;

const plural = (count: number, one: string, other: string) => `${count} ${count === 1 ? one : other}`;

/** Peso en formato es-AR, sin ceros de más: `62.5` → `"62,5"`, `60` → `"60"`, `1250` → `"1.250"`. */
export function formatWeight(value: number): string {
  const [integer = '0', decimals] = (Math.round(value * 100) / 100)
    .toFixed(2)
    .replace(/\.?0+$/, '')
    .split('.');
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return decimals ? `${grouped},${decimals}` : grouped;
}

/** `"62,5 kg"`. */
export function formatWeightKg(value: number): string {
  return `${formatWeight(value)} kg`;
}

/**
 * Series y repeticiones de una fila: "4 series · 12 repeticiones", "3 series · AMRAP". Las repeticiones que se leen como
 * cantidad (`COUNTED_REPS`: "12", "8-12") llevan la palabra; el resto ("AMRAP", "60s") va tal cual. Sin series solo
 * van las repeticiones.
 */
export function formatSetsReps(sets: number | null, reps: string): string {
  const repsLabel = COUNTED_REPS.test(reps.trim())
    ? `${reps.trim()} ${reps.trim() === '1' ? 'repetición' : 'repeticiones'}`
    : reps;
  return sets === null ? repsLabel : `${plural(sets, 'serie', 'series')} · ${repsLabel}`;
}

/** Forma corta del historial y de la nota de la hoja de peso: "4 × 12"; sin series, solo las repeticiones. */
export function formatSetsRepsShort(sets: number | null, reps: string): string {
  return sets === null ? reps : `${sets} × ${reps}`;
}

/** "3 días · 8 ejercicios". */
export function formatPlanCounts(dayCount: number, exerciseCount: number): string {
  return `${plural(dayCount, 'día', 'días')} · ${formatExerciseCount(exerciseCount)}`;
}

/** "3 ejercicios". */
export function formatExerciseCount(count: number): string {
  return plural(count, 'ejercicio', 'ejercicios');
}

/** Día y mes en la zona de la app, "12/11" (el historial no muestra el año). */
export function formatHistoryDate(iso: string): string {
  const { day, month } = calendarPartsInTimeZone(new Date(iso), APP_TIMEZONE);
  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}`;
}

/** Las tres primeras letras del día ("Lun", "Mié", "Sáb") para la tira de días. */
export function weekdayShortLabel(weekday: GymWeekday): string {
  return GYM_WEEKDAY_LABELS[weekday].slice(0, 3);
}
