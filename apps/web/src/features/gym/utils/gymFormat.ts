import { dayjs } from '@/shared/dates';

const WEIGHT_FORMAT = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 });
const NUMERIC_REPS = /^\d+(\s*[-–]\s*\d+)?$/;

/** `57.5` → `"57,5 kg"`. */
export function formatWeightKg(weightKg: number): string {
  return `${WEIGHT_FORMAT.format(weightKg)} kg`;
}

/** `57.5` → `"57,5"`, sin la unidad (el número grande del modal de peso). */
export function formatWeightNumber(weightKg: number): string {
  return WEIGHT_FORMAT.format(weightKg);
}

/**
 * Detalle de la fila: `"4 series · 12 repeticiones"`. Las repeticiones numéricas (`12`, `8-12`) llevan la palabra;
 * las demás (`AMRAP`, `60 s`) se muestran tal cual. Sin series queda solo la parte de las repeticiones.
 */
export function formatSetsAndReps(sets: number | null, reps: string): string {
  const repsLabel = NUMERIC_REPS.test(reps) ? `${reps} ${reps === '1' ? 'repetición' : 'repeticiones'}` : reps;
  if (sets === null) return repsLabel;
  return `${sets} ${sets === 1 ? 'serie' : 'series'} · ${repsLabel}`;
}

/** Forma corta de la variante: `"4 × 12"`; sin series, solo las repeticiones. */
export function formatVariantShort(sets: number | null, reps: string): string {
  return sets === null ? reps : `${sets} × ${reps}`;
}

/** Fecha de una entrada del historial: `DD/MM`, y `DD/MM/YY` si no es del año en curso. */
export function formatHistoryDate(iso: string, now: Date = new Date()): string {
  const date = dayjs(iso);
  return date.year() === now.getFullYear() ? date.format('DD/MM') : date.format('DD/MM/YY');
}
