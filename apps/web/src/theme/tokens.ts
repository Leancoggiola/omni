import {
  DISPLAY as DISPLAY_PX,
  DISPLAY_FONT,
  FONT_SIZE as FONT_SIZE_PX,
  HEADING as HEADING_PX,
  LINE_HEIGHT as LINE_HEIGHT_PX,
  RADIUS as RADIUS_PX,
  SHADOW_THEMED,
  SPACING as SPACING_PX,
} from '@omni/shared/theme';

export { BRAND, GRAY, SEMANTIC } from '@omni/shared/theme';

/** Las escalas compartidas están en px (las usa también mobile); Mantine las recibe en rem. */
function toRem<K extends string>(scale: Record<K, number>): Record<K, string> {
  const entries = Object.entries<number>(scale).map(([key, px]) => [key, px === 0 ? '0' : `${px / 16}rem`]);
  return Object.fromEntries(entries) as Record<K, string>;
}

/** Sombra nativa de `@omni/shared/theme` en CSS: `0 8px 32px rgb(150 120 111 / 0.12)`. El color tiene que ser `#RRGGBB` (el formato corto da `NaN`). */
function shadowCss({
  color,
  offsetY,
  radius,
  opacity,
}: {
  color: string;
  offsetY: number;
  radius: number;
  opacity: number;
}) {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16));
  return `0 ${offsetY}px ${radius}px rgb(${r} ${g} ${b} / ${opacity})`;
}

/** Mobile replica la capa principal de cada sombra en `SHADOW` de `@omni/shared/theme`. */
export const SHADOWS = {
  xs: '0 1px 2px rgb(0 0 0 / 0.05)',
  sm: '0 1px 3px rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  brand: '0 10px 15px -3px rgb(150 120 111 / 0.2), 0 4px 6px -4px rgb(150 120 111 / 0.2)',
  card: shadowCss(SHADOW_THEMED.card.light),
  float: shadowCss(SHADOW_THEMED.float.light),
  sheet: shadowCss(SHADOW_THEMED.sheet.light),
} as const;

/** Las sombras `card`, `float` y `sheet` en oscuro: `cssVariablesResolver` las publica sobre las de claro. */
export const SHADOWS_DARK = {
  '--mantine-shadow-card': shadowCss(SHADOW_THEMED.card.dark),
  '--mantine-shadow-float': shadowCss(SHADOW_THEMED.float.dark),
  '--mantine-shadow-sheet': shadowCss(SHADOW_THEMED.sheet.dark),
} as const;

export const RADIUS = { ...toRem(RADIUS_PX), full: `${RADIUS_PX.full}px` };

export const SPACING = toRem(SPACING_PX);

export const FONT_SIZES = toRem(FONT_SIZE_PX);

export const LINE_HEIGHTS = toRem(LINE_HEIGHT_PX);

/**
 * `Object.fromEntries` tipa las claves como `string`: el cast recupera `h1`…`h6`, que son las mismas
 * claves de `HEADING` porque se recorren todas.
 */
export const HEADING_SIZES = Object.fromEntries(
  Object.entries(HEADING_PX).map(([order, { fontSize, lineHeight }]) => [
    order,
    { fontSize: `${fontSize / 16}rem`, lineHeight: `${lineHeight / 16}rem` },
  ])
) as Record<keyof typeof HEADING_PX, { fontSize: string; lineHeight: string }>;

/** Familia de los títulos grandes (Bricolage Grotesque), con la sans del tema de respaldo. */
export const DISPLAY_FONT_FAMILY = `"${DISPLAY_FONT}", "Segoe UI", system-ui, sans-serif`;

/** Estilos `display` de v2 con tamaños en rem; el tracking, también en rem. */
export const DISPLAY_STYLES = Object.fromEntries(
  Object.entries(DISPLAY_PX).map(([name, { fontSize, lineHeight, fontWeight, letterSpacing }]) => [
    name,
    {
      fontSize: `${fontSize / 16}rem`,
      lineHeight: `${lineHeight / 16}rem`,
      fontWeight,
      letterSpacing: `${letterSpacing / 16}rem`,
    },
  ])
) as Record<
  keyof typeof DISPLAY_PX,
  { fontSize: string; lineHeight: string; fontWeight: number; letterSpacing: string }
>;
