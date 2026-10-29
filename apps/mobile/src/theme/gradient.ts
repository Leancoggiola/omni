type Point = { x: number; y: number };

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
