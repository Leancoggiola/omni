import { useMantineTheme } from '@mantine/core';

import type { DISPLAY_STYLES } from '@/theme/tokens';

/** Props de estilo (`ff`, `fz`, `lh`, `fw`, `lts`) de un estilo `display` del tema (Bricolage Grotesque). */
export function useDisplayStyles(name: keyof typeof DISPLAY_STYLES) {
  const { other } = useMantineTheme();
  const { fontSize, lineHeight, fontWeight, letterSpacing } = other.display[name];
  return { ff: other.displayFontFamily, fz: fontSize, lh: lineHeight, fw: fontWeight, lts: letterSpacing };
}
