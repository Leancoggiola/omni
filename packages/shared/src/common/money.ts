const MONEY_SCALE = 100;

/** Redondea un importe a 2 decimales: evita totales como `0.30000000000000004` al sumar en float. */
export function roundMoney(value: number): number {
  return Math.round(value * MONEY_SCALE) / MONEY_SCALE;
}
