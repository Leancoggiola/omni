import { FC, ReactNode } from 'react';
import { Text } from '@mantine/core';

interface OverlineProps {
  children: ReactNode;
}

/** Encabezado de sección en mayúsculas (`OVERLINE`), para separar bloques de una lista o de un modal. */
export const Overline: FC<OverlineProps> = ({ children }) => (
  <Text size="xs" fw={700} c="dimmed" tt="uppercase" lts="0.04rem">
    {children}
  </Text>
);
