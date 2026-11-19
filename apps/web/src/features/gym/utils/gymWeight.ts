import { AMOUNT_MAX_8_2 } from '@omni/shared/common';

export const WEIGHT_STEP_KG = 2.5;

export const WEIGHT_MAX_KG = AMOUNT_MAX_8_2;

const WEIGHT_MAX_LABEL = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2 }).format(WEIGHT_MAX_KG);

/** Redondea a 2 decimales, la precisión de la columna (evita `62.50000000001`). */
export function roundWeight(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Suma o resta un paso, sin bajar de 0 ni pasar el máximo. */
export function stepWeight(value: number, direction: 1 | -1): number {
  return Math.min(WEIGHT_MAX_KG, Math.max(0, roundWeight(value + direction * WEIGHT_STEP_KG)));
}

/** El número que escribió el usuario: `null` si el campo está vacío o no es un número. */
export function parseWeight(value: number | string): number | null {
  if (value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(value.replace(',', '.'));
  return Number.isFinite(parsed) ? roundWeight(parsed) : null;
}

/** Mensaje de validación del peso escrito, o `null` si es válido o está vacío (0 es válido, la API acepta ≥ 0). */
export function weightError(value: number | string): string | null {
  if (value === '') return null;
  const parsed = parseWeight(value);
  if (parsed === null) return 'Ingresá un número';
  if (parsed < 0) return 'El peso no puede ser negativo';
  if (parsed > WEIGHT_MAX_KG) return `El peso máximo es ${WEIGHT_MAX_LABEL} kg`;
  return null;
}
