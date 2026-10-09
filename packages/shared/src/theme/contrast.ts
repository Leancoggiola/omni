/** Mínimo de WCAG 2.x (AA) para texto normal. */
export const WCAG_AA_TEXT = 4.5;

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** Luminancia relativa de WCAG para un color `#RRGGBB` (el alfa, si viene, se ignora). */
export function relativeLuminance(hex: string): number {
  const rgb = /^#([0-9a-f]{6})(?:[0-9a-f]{2})?$/i.exec(hex)?.[1];
  if (!rgb) throw new Error(`relativeLuminance: se esperaba #RRGGBB, llegó "${hex}"`);
  const n = parseInt(rgb, 16);
  return 0.2126 * channel((n >> 16) & 0xff) + 0.7152 * channel((n >> 8) & 0xff) + 0.0722 * channel(n & 0xff);
}

/** Contraste de WCAG entre dos colores `#RRGGBB` (de 1 a 21). */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** De los `candidates`, el que más contrasta con `fill` (el primero si empatan). */
export function pickOnFill(fill: string, candidates: readonly [string, ...string[]]): string {
  return candidates.reduce((best, candidate) =>
    contrastRatio(fill, candidate) > contrastRatio(fill, best) ? candidate : best
  );
}
