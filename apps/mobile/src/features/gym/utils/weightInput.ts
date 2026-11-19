import { AMOUNT_MAX_8_2 } from '@omni/shared/common';

import { formatWeight } from './gymFormat';

/**
 * El número que escribió la persona (coma o punto decimal, hasta 2 decimales): `null` si el campo está vacío o no es
 * un peso (`0x1A`, `1e3` y `0,004` no lo son).
 */
export function parseWeightInput(value: string): number | null {
  const trimmed = value.trim().replace(',', '.');
  if (!/^-?(\d+(\.\d{0,2})?|\.\d{1,2})$/.test(trimmed)) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : null;
}

/** El peso como texto editable, con coma y sin separador de miles para que `parseWeightInput` lo lea igual: `1250.5` → `"1250,5"`. */
export function weightInputText(value: number): string {
  return String(Math.round(value * 100) / 100).replace('.', ',');
}

/** Mensaje de validación del peso escrito, o `null` si es válido o está vacío (0 es válido, la API acepta ≥ 0). */
export function weightInputError(value: string): string | null {
  if (value.trim() === '') return null;
  const parsed = parseWeightInput(value);
  if (parsed === null) return 'Ingresá un número';
  if (parsed < 0) return 'El peso no puede ser negativo';
  if (parsed > AMOUNT_MAX_8_2) return `El peso máximo es ${formatWeight(AMOUNT_MAX_8_2)} kg`;
  return null;
}
