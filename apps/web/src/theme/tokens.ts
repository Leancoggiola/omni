import {
  FONT_SIZE as FONT_SIZE_PX,
  HEADING as HEADING_PX,
  LINE_HEIGHT as LINE_HEIGHT_PX,
  RADIUS as RADIUS_PX,
  SPACING as SPACING_PX,
} from '@omni/shared/theme';

export { BRAND, GRAY, SEMANTIC } from '@omni/shared/theme';

/** Las escalas compartidas están en px (las usa también mobile); Mantine las recibe en rem. */
function toRem<K extends string>(scale: Record<K, number>): Record<K, string> {
  const entries = Object.entries<number>(scale).map(([key, px]) => [key, px === 0 ? '0' : `${px / 16}rem`]);
  return Object.fromEntries(entries) as Record<K, string>;
}

/** Mobile replica la capa principal de cada sombra en `SHADOW` de `@omni/shared/theme`. */
export const SHADOWS = {
  xs: '0 1px 2px rgb(0 0 0 / 0.05)',
  sm: '0 1px 3px rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  brand: '0 10px 15px -3px rgb(150 120 111 / 0.2), 0 4px 6px -4px rgb(150 120 111 / 0.2)',
} as const;

export const RADIUS = { ...toRem(RADIUS_PX), full: `${RADIUS_PX.full}px` };

export const SPACING = toRem(SPACING_PX);

export const FONT_SIZES = toRem(FONT_SIZE_PX);

export const LINE_HEIGHTS = toRem(LINE_HEIGHT_PX);

export const HEADING_SIZES = Object.fromEntries(
  Object.entries(HEADING_PX).map(([order, { fontSize, lineHeight }]) => [
    order,
    { fontSize: `${fontSize / 16}rem`, lineHeight: `${lineHeight / 16}rem` },
  ])
) as Record<keyof typeof HEADING_PX, { fontSize: string; lineHeight: string }>;
