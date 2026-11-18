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

/**
 * Paleta de un estado semántico (info, warning, error, destructive). `dark` es el color de oscuro y el de
 * los tonos que Mantine no usa en claro; `lightFill` ocupa los tonos 7 y 8 (relleno, `-text`, outline y su
 * hover con `primaryShade` de claro en 7) y `lightText` el 9 (`-light-color`, el texto sobre el wash).
 * En destructive el relleno (`RED[7]`) queda más claro que el texto (`RED[9]`): el blanco encima ya cumple
 * AA con el relleno, pero el rojo de texto sobre su wash necesita el tono más oscuro.
 */
function stateTuple(dark: string, lightFill: string, lightText: string): MantineColorsTuple {
  const tuple = [...colorsTuple(dark)];
  tuple[7] = lightFill;
  tuple[8] = lightFill;
  tuple[9] = lightText;
  return tuple as unknown as MantineColorsTuple;
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
  info: stateTuple(BLUE[6], BLUE[8], BLUE[8]),
  warning: stateTuple(ORANGE[8], ORANGE[9], ORANGE[9]),
  error: stateTuple(RED[7], RED[9], RED[9]),
  destructive: stateTuple(RED[7], RED[7], RED[9]),
};
