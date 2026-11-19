import { FC } from 'react';
import { ThemeIcon } from '@mantine/core';

import { BarbellIcon } from '@phosphor-icons/react';

interface ExerciseTileProps {
  size?: string;
}

/** Ícono del ejercicio en un recuadro terracota claro (filas del día y encabezado del modal de peso). */
export const ExerciseTile: FC<ExerciseTileProps> = ({ size = '2.75rem' }) => (
  <ThemeIcon variant="light" color="terracotta" size={size} radius="md" aria-hidden="true">
    <BarbellIcon size="1.375rem" />
  </ThemeIcon>
);
