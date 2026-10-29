import { type ColorScheme, SHADOW, SHADOW_THEMED } from '@omni/shared/theme';

/**
 * Props de sombra nativa para `SHADOW[level]` de `@omni/shared/theme` (equivale a `shadow="sm"` de
 * Mantine). iOS usa `shadow*`; Android solo `elevation`. Se esparcen sobre un Stack de Tamagui.
 */
export function elevation(level: keyof typeof SHADOW) {
  const s = SHADOW[level];
  return {
    shadowColor: s.color,
    shadowOffset: { width: 0, height: s.offsetY },
    shadowOpacity: s.opacity,
    shadowRadius: s.radius,
    elevation: s.elevation,
  };
}

/**
 * Props de sombra nativa para las sombras cálidas de v2 (`card`, `float`, `sheet`), que cambian según el
 * esquema. Misma forma que `elevation`.
 */
export function themedElevation(level: keyof typeof SHADOW_THEMED, scheme: ColorScheme) {
  const s = SHADOW_THEMED[level][scheme];
  return {
    shadowColor: s.color,
    shadowOffset: { width: 0, height: s.offsetY },
    shadowOpacity: s.opacity,
    shadowRadius: s.radius,
    elevation: s.elevation,
  };
}
