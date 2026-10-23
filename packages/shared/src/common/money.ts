const MONEY_SCALE = 100;

export const MONEY_FORMAT = {
  prefix: '$',
  thousandSeparator: '.',
  decimalSeparator: ',',
  decimalScale: 2,
} as const;

/** Redondea un importe a 2 decimales: evita totales como `0.30000000000000004` al sumar en float. */
export function roundMoney(value: number): number {
  return Math.round(value * MONEY_SCALE) / MONEY_SCALE;
}

/** Importe en formato es-AR con `MONEY_FORMAT`: `13124` → `"$13.124,00"`, `-5.5` → `"-$5,50"`. */
export function formatMoney(value: number): string {
  const { prefix, thousandSeparator, decimalSeparator, decimalScale } = MONEY_FORMAT;
  const [integer = '0', decimals = ''] = Math.abs(value).toFixed(decimalScale).split('.');
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, thousandSeparator);
  const sign = value < 0 && Number(`${integer}.${decimals}`) !== 0 ? '-' : '';
  return `${sign}${prefix}${grouped}${decimalSeparator}${decimals}`;
}
