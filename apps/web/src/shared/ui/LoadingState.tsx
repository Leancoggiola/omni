import { FC } from 'react';
import { Center, Group, Loader, MantineSize, MantineSpacing, Skeleton, Stack } from '@mantine/core';

const SKELETON_ROWS = 3;
const SKELETON_TITLE_WIDTHS = ['45%', '55%', '40%', '50%'];
const SKELETON_SUBTITLE_WIDTHS = ['65%', '50%', '60%', '45%'];

interface LoadingStateProps {
  variant?: 'spinner' | 'skeleton';
  size?: MantineSize;
  /** Vertical padding, matches the surrounding block spacing. */
  py?: MantineSpacing;
  rows?: number;
}

/**
 * Carga de los estados de UI compartidos, mismo contrato que `LoadingState` de mobile (regla de oro 0). En las dos
 * variantes el contenedor es un `status` llamado "Cargando". `variant="spinner"` (por defecto) es el loader de marca,
 * con `size` y `py`; `variant="skeleton"` dibuja `rows` filas con la forma de una lista y no usa esos dos props.
 */
export const LoadingState: FC<LoadingStateProps> = ({
  variant = 'spinner',
  size = 'md',
  py = 'xl',
  rows = SKELETON_ROWS,
}) => {
  if (variant === 'skeleton') {
    return (
      <Stack gap="md" role="status" aria-label="Cargando">
        {Array.from({ length: rows }, (_, index) => (
          <Group key={index} gap="md" wrap="nowrap" align="center">
            <Skeleton circle h="2.5rem" w="2.5rem" style={{ flex: 'none' }} />
            <Stack gap="xs" style={{ flex: 1 }}>
              <Skeleton h="1rem" w={SKELETON_TITLE_WIDTHS[index % SKELETON_TITLE_WIDTHS.length]} />
              <Skeleton h="0.75rem" w={SKELETON_SUBTITLE_WIDTHS[index % SKELETON_SUBTITLE_WIDTHS.length]} />
            </Stack>
            <Skeleton h="1.25rem" w="5.5rem" radius="xl" visibleFrom="sm" />
          </Group>
        ))}
      </Stack>
    );
  }

  return (
    <Center py={py}>
      <Loader size={size} role="status" aria-label="Cargando" />
    </Center>
  );
};
