type Point = { x: number; y: number };

const HEX_COLOR = /^#[0-9a-f]{6}([0-9a-f]{2})?$/i;

/**
 * El mismo color con alfa 0, para el extremo "transparente" de un gradiente. No usar
 * `'transparent'`: es negro con alfa 0 y Android interpola sin premultiplicar, así que deja una
 * banda gris a mitad del gradiente. Los colores de `SEMANTIC` son `#rrggbb` o `#rrggbbaa`.
 */
export function transparentOf(color: string): string {
  if (!HEX_COLOR.test(color)) {
    throw new Error(`transparentOf espera un color #rrggbb o #rrggbbaa, recibió "${color}"`);
  }
  return `${color.slice(0, 7)}00`;
}

/**
 * Traduce un ángulo CSS (0° hacia arriba, 90° hacia la derecha) a los puntos `start` / `end`
 * de expo-linear-gradient, para reusar `GRADIENT_STOPS` de `@omni/shared/theme` tal cual.
 */
export function gradientPoints(deg: number): { start: Point; end: Point } {
  const rad = (deg * Math.PI) / 180;
  const dx = Math.sin(rad) / 2;
  const dy = -Math.cos(rad) / 2;
  return {
    start: { x: 0.5 - dx, y: 0.5 - dy },
    end: { x: 0.5 + dx, y: 0.5 + dy },
  };
}
