import type { GRADIENTS } from './gradients';
import type { DISPLAY_STYLES } from './tokens';
import type { DefaultMantineColor, DefaultMantineSize } from '@mantine/core';

type AppSpacing = 'none' | '3xs' | '2xs' | '4xl' | DefaultMantineSize;
type AppColors =
  | 'brand'
  | 'terracotta'
  | 'sage'
  | 'success'
  | 'info'
  | 'warning'
  | 'error'
  | 'destructive'
  | DefaultMantineColor;

declare module '@mantine/core' {
  export interface MantineThemeOther {
    gradients: typeof GRADIENTS;
    displayFontFamily: string;
    display: typeof DISPLAY_STYLES;
  }

  export interface MantineThemeSizesOverride {
    shadows: Record<'xs' | 'sm' | 'md' | 'lg' | 'brand' | 'card' | 'float' | 'sheet', string>;
    radius: Record<'none' | '2xl' | 'full' | DefaultMantineSize, string>;
    spacing: Record<AppSpacing, string>;
  }

  export interface MantineThemeColorsOverride {
    colors: Record<AppColors, import('@mantine/core').MantineColorsTuple>;
  }

  export interface AlertProps {
    variant?: 'light-custom';
  }
}
