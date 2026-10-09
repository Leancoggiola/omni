import {
  type CSSVariablesResolver,
  defaultVariantColorsResolver,
  getPrimaryShade,
  isVirtualColor,
  type MantineTheme,
  parseThemeColor,
  type VariantColorsResolver,
} from '@mantine/core';

import { onFill, semanticDark, semanticLight } from '@omni/shared/theme';

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

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

/** Variable con el texto de un `filled` de `color` sin tono explícito (cambia con el esquema). */
const onFilledVar = (color: string) => `--mantine-color-${color}-on-filled`;

/**
 * `--mantine-color-<color>-on-filled` de cada paleta en un esquema: el texto que más contrasta con su
 * `filled` (el tono de `primaryShade` de ese esquema). Reemplaza al `autoContrast` de Mantine, que lo
 * calcula con el tono de claro y en oscuro deja texto blanco sobre el shade 4 (~3:1).
 */
function onFilledVariables(theme: MantineTheme, scheme: 'light' | 'dark'): Record<string, string> {
  const shade = getPrimaryShade(theme, scheme);
  return Object.fromEntries(
    Object.entries(theme.colors).flatMap(([color, scale]) => {
      const fill = scale[shade];
      if (!fill || !HEX_COLOR.test(fill)) return [];
      const text = onFill(fill);
      // El hover de Mantine siempre oscurece un tono: con texto oscuro encima (dark) bajaba de AA.
      // Con texto oscuro se aclara, igual que `primaryFillHover` de mobile.
      const hoverShade = text === '#ffffff' ? Math.min(shade + 1, 9) : Math.max(shade - 1, 0);
      const hover = scale[hoverShade] ?? fill;
      return [
        [onFilledVar(color), text],
        [`--mantine-color-${color}-filled-hover`, hover],
      ];
    })
  );
}

export const cssVariablesResolver: CSSVariablesResolver = theme => ({
  variables: {},
  light: {
    ...mantineCoreLight,
    ...semanticLight,
    ...onFilledVariables(theme, 'light'),
  },
  dark: {
    ...mantineCoreDark,
    ...semanticDark,
    ...onFilledVariables(theme, 'dark'),
  },
});

/** Texto de un `filled` con `autoContrast`; `null` deja el de Mantine (colores no hex, virtuales). */
function filledTextColor(color: string, theme: MantineTheme): string | null {
  const parsed = parseThemeColor({ color, theme });
  if (!parsed.isThemeColor) return HEX_COLOR.test(color) ? onFill(color) : null;
  const scale = theme.colors[parsed.color];
  if (!scale || isVirtualColor(scale)) return null;
  // Con tono explícito (`brand.6`) el relleno es el mismo en los dos esquemas.
  if (parsed.shade !== undefined) {
    const fill = scale[parsed.shade];
    return fill && HEX_COLOR.test(fill) ? onFill(fill) : null;
  }
  return `var(${onFilledVar(parsed.color)})`;
}

export const variantResolver: VariantColorsResolver = input => {
  const defaultResolvedColors = defaultVariantColorsResolver(input);
  const color = input.color || input.theme.primaryColor;

  const parsedColor = parseThemeColor({
    color,
    theme: input.theme,
  });

  // Override some properties for variant
  if (input.variant === 'light-custom') {
    return {
      ...defaultResolvedColors,
      background: `var(--mantine-color-surfaces-${parsedColor.color}-light)`,
      border: `1px solid var(--mantine-color-border-${parsedColor.color})`,
    };
  }

  const autoContrast = input.autoContrast ?? input.theme.autoContrast;
  if (input.variant === 'filled' && autoContrast) {
    const text = filledTextColor(color, input.theme);
    if (text) return { ...defaultResolvedColors, color: text };
  }

  return defaultResolvedColors;
};
