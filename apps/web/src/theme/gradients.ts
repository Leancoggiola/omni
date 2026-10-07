import type { MantineGradient } from '@mantine/core';

import { BRAND, TERRACOTTA } from '@omni/shared/theme';

export const GRADIENTS = {
  brand: {
    from: BRAND[5],
    to: BRAND[7],
    deg: 90,
  },
  terracotta: {
    from: TERRACOTTA[4],
    to: TERRACOTTA[7],
    deg: 90,
  },
  cardLight: {
    from: BRAND[0],
    to: BRAND[2],
    deg: 215,
  },
  cardDark: {
    from: BRAND[4],
    to: BRAND[5],
    deg: 215,
  },
} as const satisfies Record<string, MantineGradient>;
