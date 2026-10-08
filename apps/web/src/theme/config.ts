import { createTheme } from '@mantine/core';

import { ComponentsOverride } from './components';
import { variantResolver } from './css-variables';
import { GRADIENTS } from './gradients';
import { COLOR_PALETTE } from './palettes';
import { RADIUS, SHADOWS, SPACING } from './tokens';

export const THEME = createTheme({
  fontFamily: '"Montserrat", sans-serif',
  primaryColor: 'brand',
  primaryShade: { light: 7, dark: 4 },
  variantColorResolver: variantResolver,

  cursorType: 'pointer',
  autoContrast: true,
  black: '#0a0a0a',
  white: '#ffffff',

  colors: COLOR_PALETTE,

  defaultGradient: GRADIENTS.brand,
  other: {
    gradients: GRADIENTS,
  },

  defaultRadius: 'lg',
  radius: RADIUS,

  spacing: SPACING,

  breakpoints: {
    xs: '30em',
    sm: '48em',
    md: '62em',
    lg: '75em',
    xl: '90em',
  },

  fontSizes: {
    xs: '0.625rem',
    sm: '0.75rem',
    md: '0.875rem',
    lg: '1rem',
    xl: '1.125rem',
  },

  lineHeights: {
    xs: '0.75rem',
    sm: '0.875rem',
    md: '1rem',
    lg: '1.125rem',
    xl: '1.375rem',
  },

  headings: {
    fontWeight: '700',
    sizes: {
      h1: {
        fontSize: '1.75rem',
        lineHeight: '2.0625rem',
      },
      h2: {
        fontSize: '1.375rem',
        lineHeight: '1.875rem',
      },
      h3: {
        fontSize: '1.125rem',
        lineHeight: '1.375rem',
      },
      h4: {
        fontSize: '1rem',
        lineHeight: '1.125rem',
      },
      h5: {
        fontSize: '0.875rem',
        lineHeight: '1rem',
      },
      h6: {
        fontSize: '0.75rem',
        lineHeight: '0.875rem',
      },
    },
  },

  shadows: SHADOWS,
  components: ComponentsOverride,
});
