import { DarkTheme, DefaultTheme, type Theme } from '@react-navigation/native';
import { SEMANTIC } from '@omni/shared/theme';

function buildTheme(scheme: 'light' | 'dark'): Theme {
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const s = SEMANTIC[scheme];
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: s.primary,
      background: s.body,
      card: s.card,
      text: s.text,
      border: s.border,
      notification: s.destructive,
    },
    // Caras cargadas en `theme/fonts.ts`: en Android cada peso es su propia familia.
    fonts: {
      regular: { fontFamily: 'Montserrat', fontWeight: 'normal' },
      medium: { fontFamily: 'MontserratMedium', fontWeight: 'normal' },
      bold: { fontFamily: 'MontserratSemiBold', fontWeight: 'normal' },
      heavy: { fontFamily: 'MontserratBold', fontWeight: 'normal' },
    },
  };
}

/** Header y tab bar de React Navigation con los mismos tokens que Tamagui. */
export const NAVIGATION_THEMES = {
  light: buildTheme('light'),
  dark: buildTheme('dark'),
} as const;
