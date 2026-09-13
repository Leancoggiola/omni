import { type CSSVariablesResolver, defaultVariantColorsResolver, type VariantColorsResolver } from '@mantine/core';

import { semanticDark, semanticLight } from '@omni/shared/theme';

/** Core Mantine vars mapped from the full semantic token set. */
const mantineCoreLight = {
  '--mantine-color-body': semanticLight['--mantine-color-surfaces-device-bg'],
  '--mantine-color-text': semanticLight['--mantine-color-text-default'],
  '--mantine-color-bright': semanticLight['--mantine-color-text-title'],
  '--mantine-color-default': semanticLight['--mantine-color-surfaces-card'],
  '--mantine-color-default-hover': semanticLight['--mantine-color-surfaces-hover'],
  '--mantine-color-default-border': semanticLight['--mantine-color-border-dimmed-light'],
  '--mantine-color-error': semanticLight['--mantine-color-text-error'],
  '--mantine-color-dimmed': semanticLight['--mantine-color-text-dimmed'],
  '--mantine-color-placeholder': semanticLight['--mantine-color-text-placeholder'],
  '--mantine-color-anchor': semanticLight['--mantine-color-text-link-default'],
} as const;

const mantineCoreDark = {
  '--mantine-color-body': semanticDark['--mantine-color-surfaces-device-bg'],
  '--mantine-color-text': semanticDark['--mantine-color-text-default'],
  '--mantine-color-bright': semanticDark['--mantine-color-text-title'],
  '--mantine-color-default': semanticDark['--mantine-color-surfaces-card'],
  '--mantine-color-default-hover': semanticDark['--mantine-color-surfaces-hover'],
  '--mantine-color-default-border': semanticDark['--mantine-color-border-dimmed'],
  '--mantine-color-error': semanticDark['--mantine-color-text-error'],
  '--mantine-color-dimmed': semanticDark['--mantine-color-text-dimmed'],
  '--mantine-color-placeholder': semanticDark['--mantine-color-text-placeholder'],
  '--mantine-color-anchor': semanticDark['--mantine-color-text-link-default'],
} as const;

export const cssVariablesResolver: CSSVariablesResolver = () => ({
  variables: {},
  light: {
    ...semanticLight,
    ...mantineCoreLight,
  },
  dark: {
    ...semanticDark,
    ...mantineCoreDark,
  },
});

export const variantResolver: VariantColorsResolver = input => {
  const defaultResolvedColors = defaultVariantColorsResolver(input);
  // const parsedColor = parseThemeColor({
  //   color: input.color || input.theme.primaryColor,
  //   theme: input.theme
  // })

  return defaultResolvedColors;
};
