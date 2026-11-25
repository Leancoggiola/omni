import { HEADING } from '@omni/shared/theme';
import type { ParagraphProps } from 'tamagui';

import { Paragraph } from './Paragraph';

type TitleProps = Omit<ParagraphProps, 'order'> & {
  /** Mismo nivel que `Title order` de Mantine: tamaños de `HEADING` en `@omni/shared/theme`. */
  order?: 1 | 2 | 3 | 4 | 5 | 6;
};

export function Title({ order = 1, ...props }: TitleProps) {
  const { fontSize, lineHeight } = HEADING[`h${order}`];
  return (
    <Paragraph
      fontSize={fontSize}
      lineHeight={`${lineHeight}px`}
      fontWeight="700"
      color="color"
      accessibilityRole="header"
      {...props}
    />
  );
}
