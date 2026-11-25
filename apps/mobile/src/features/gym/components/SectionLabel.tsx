import { OVERLINE } from '@omni/shared/theme';

import { Paragraph } from '@/shared/ui';

/** Encabezado de sección del DS (`OVERLINE`: 12/16, 700, en mayúsculas): "LUNES", "HISTORIAL". */
export function SectionLabel({ children }: { children: string }) {
  return (
    <Paragraph
      color="dimmed"
      fontSize={OVERLINE.fontSize}
      lineHeight={`${OVERLINE.lineHeight}px`}
      fontWeight="700"
      letterSpacing={OVERLINE.letterSpacing}
      textTransform="uppercase"
      accessibilityRole="header"
    >
      {children}
    </Paragraph>
  );
}
