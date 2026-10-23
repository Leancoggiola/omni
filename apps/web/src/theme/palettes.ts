import { colorsTuple, type MantineColorsTuple } from '@mantine/core';

import {
  BLUE,
  BRAND,
  DARK,
  GRAY,
  GREEN,
  INDIGO,
  LIME,
  ORANGE,
  PINK,
  RED,
  SAGE,
  TERRACOTTA,
  YELLOW,
} from '@omni/shared/theme';

type ColorScale10 = {
  readonly 0: string;
  readonly 1: string;
  readonly 2: string;
  readonly 3: string;
  readonly 4: string;
  readonly 5: string;
  readonly 6: string;
  readonly 7: string;
  readonly 8: string;
  readonly 9: string;
};

/** Shared scales are keyed objects; Mantine theme.colors needs a 10-shade tuple. */
function toTuple(scale: ColorScale10): MantineColorsTuple {
  return [scale[0], scale[1], scale[2], scale[3], scale[4], scale[5], scale[6], scale[7], scale[8], scale[9]];
}

export const COLOR_PALETTE = {
  brand: toTuple(BRAND),

  dark: toTuple(DARK),
  gray: toTuple(GRAY),

  blue: toTuple(BLUE),
  green: toTuple(GREEN),
  red: toTuple(RED),
  orange: toTuple(ORANGE),

  indigo: toTuple(INDIGO),
  lime: toTuple(LIME),
  yellow: toTuple(YELLOW),
  pink: toTuple(PINK),
  terracotta: toTuple(TERRACOTTA),
  sage: toTuple(SAGE),

  success: colorsTuple(SAGE[6]),
  info: colorsTuple(BLUE[6]),
  warning: colorsTuple(ORANGE[8]),
  error: colorsTuple(RED[7]),
  destructive: colorsTuple(RED[7]),
};
