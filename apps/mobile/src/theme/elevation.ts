import { SHADOW } from '@omni/shared/theme';

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
