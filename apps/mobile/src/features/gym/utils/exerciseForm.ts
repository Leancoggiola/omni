import { EXERCISE_SETS_MAX } from '@omni/shared/common';

import type { GymCatalogExercise } from '@omni/shared/gym';

/** Nombre sin mayúsculas ni espacios en los bordes: la misma regla que usa la API para comparar variantes. */
function normalizeName(value: string): string {
  return value.trim().toLowerCase();
}

/** Repeticiones sin espacios ni mayúsculas ("8 - 12" = "8-12", "AMRAP" = "amrap"), como en la API. */
function normalizeReps(value: string): string {
  return value.replace(/\s+/g, '').toLowerCase();
}

type Variant = { name: string; sets: number | null; reps: string };

export function isSameVariant(a: Variant, b: Variant): boolean {
  return (
    normalizeName(a.name) === normalizeName(b.name) &&
    a.sets === b.sets &&
    normalizeReps(a.reps) === normalizeReps(b.reps)
  );
}

/** La variante del catálogo que coincide exacto con nombre, series y repeticiones, si hay. */
export function findSameVariant(
  catalog: readonly GymCatalogExercise[],
  value: Variant
): GymCatalogExercise | undefined {
  return catalog.find(item => isSameVariant(item, value));
}

/**
 * Series del campo de texto: vacío es "sin series" (`null`); un entero de 1 a `EXERCISE_SETS_MAX` es el número; el
 * resto, `undefined` (inválido).
 */
export function parseSetsInput(value: string): number | null | undefined {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  if (!/^\d+$/.test(trimmed)) return undefined;
  const sets = Number(trimmed);
  return sets >= 1 && sets <= EXERCISE_SETS_MAX ? sets : undefined;
}
