import { FC, ReactNode } from 'react';
import { Text } from '@mantine/core';

interface OverlineProps {
  children: ReactNode;
}

/** Encabezado de sección en mayúsculas (Activas, Saldadas) y separador de día del feed. */
export const Overline: FC<OverlineProps> = ({ children }) => (
  <Text size="xs" fw={700} c="dimmed" tt="uppercase" lts="0.04rem">
    {children}
  </Text>
);
