import { createTheme } from '@mantine/core';

import { ComponentsOverride } from './components';
import { variantResolver } from './css-variables';
import { GRADIENTS } from './gradients';
import { COLOR_PALETTE } from './palettes';
import {
  DISPLAY_FONT_FAMILY,
  DISPLAY_STYLES,
  FONT_SIZES,
  HEADING_SIZES,
  LINE_HEIGHTS,
  RADIUS,
  SHADOWS,
  SPACING,
} from './tokens';

import { BLACK, WHITE } from '@omni/shared/theme';

export const THEME = createTheme({
  fontFamily: '"Montserrat", sans-serif',
  primaryColor: 'brand',
  primaryShade: { light: 7, dark: 4 },
  variantColorResolver: variantResolver,

  cursorType: 'pointer',
  autoContrast: true,
  black: BLACK,
  white: WHITE,

  colors: COLOR_PALETTE,

  defaultGradient: GRADIENTS.brand,
  other: {
    gradients: GRADIENTS,
    displayFontFamily: DISPLAY_FONT_FAMILY,
    display: DISPLAY_STYLES,
  },

  defaultRadius: 'md',
  radius: RADIUS,

  spacing: SPACING,

  breakpoints: {
    xs: '30em',
    sm: '48em',
    md: '62em',
    lg: '75em',
    xl: '90em',
  },

  fontSizes: FONT_SIZES,

  lineHeights: LINE_HEIGHTS,

  headings: {
    fontWeight: '700',
    sizes: HEADING_SIZES,
  },

  shadows: SHADOWS,
  components: ComponentsOverride,
});
