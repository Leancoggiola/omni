import type { GRADIENTS } from './gradients';
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
  }

  export interface MantineThemeSizesOverride {
    shadows: Record<'xs' | 'sm' | 'md' | 'lg' | 'brand', string>;
    spacing: Record<AppSpacing, string>;
  }

  export interface MantineThemeColorsOverride {
    colors: Record<AppColors, import('@mantine/core').MantineColorsTuple>;
  }

  export interface AlertProps {
    variant?: 'light-custom';
  }
}
