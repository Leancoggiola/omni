import type { GymCatalogExercise } from '@omni/shared/gym';

/**
 * Misma regla que la API (`variantKey` de `gym.service.ts`): nombre sin mayúsculas ni espacios en los bordes y
 * repeticiones sin espacios ni mayúsculas. Si la API cambia la regla, esto tiene que cambiar con ella.
 */
function normalizeName(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeReps(value: string): string {
  return value.replace(/\s+/g, '').toLowerCase();
}

interface VariantInput {
  name: string;
  sets: number | null;
  reps: string;
}

/** La variante del catálogo que la API va a reutilizar al agregar `input`, si está entre `catalog`. */
export function findMatchingVariant(
  catalog: GymCatalogExercise[],
  input: VariantInput
): GymCatalogExercise | undefined {
  const name = normalizeName(input.name);
  const reps = normalizeReps(input.reps);
  if (!name || !reps) return undefined;
  return catalog.find(
    variant =>
      normalizeName(variant.name) === name && variant.sets === input.sets && normalizeReps(variant.reps) === reps
  );
}
