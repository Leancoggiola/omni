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
  };
}

/** Header y tab bar de React Navigation con los mismos tokens que Tamagui. */
export const NAVIGATION_THEMES = {
  light: buildTheme('light'),
  dark: buildTheme('dark'),
} as const;
