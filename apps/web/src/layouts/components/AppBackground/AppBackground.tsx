import { Box } from '@mantine/core';

import type { FC } from 'react';

import styles from './AppBackground.module.scss';

interface AppBackgroundProps {
  animated?: boolean;
}

/**
 * Fondo cálido de v2: dos manchas difusas (`glow-peach` arriba a la izquierda, `glow-lilac` abajo a la derecha).
 * Decorativo. Con `animated` las manchas se mueven despacio; con `prefers-reduced-motion` quedan quietas.
 */
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
