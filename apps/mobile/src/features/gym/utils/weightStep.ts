import { AMOUNT_MAX_8_2 } from '@omni/shared/common';

export const WEIGHT_STEP_KG = 2.5;

/** Suma `delta` (el +/- de la hoja usa `WEIGHT_STEP_KG`) al peso sin arrastrar error de float y sin salir de 0…`AMOUNT_MAX_8_2` (la cota de la API). */
export function stepWeight(value: number, delta: number): number {
  const next = Math.round((value + delta) * 100) / 100;
  return Math.min(AMOUNT_MAX_8_2, Math.max(0, next));
}
