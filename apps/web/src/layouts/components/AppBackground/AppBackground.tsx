import { Box } from '@mantine/core';

import type { FC } from 'react';

import styles from './AppBackground.module.scss';

interface AppBackgroundProps {
  /** Las manchas se mueven despacio; con `prefers-reduced-motion` quedan quietas. */
  animated?: boolean;
}

/** Fondo cálido de v2: dos manchas difusas (`glow-peach` arriba a la izquierda, `glow-lilac` abajo a la derecha). Decorativo. */
export const AppBackground: FC<AppBackgroundProps> = ({ animated = false }) => (
  <Box
    className={animated ? `${styles.root} ${styles.animated}` : styles.root}
    aria-hidden
    data-testid="app-background"
  >
    <Box className={`${styles.blob} ${styles.peach}`} />
    <Box className={`${styles.blob} ${styles.lilac}`} />
  </Box>
);
