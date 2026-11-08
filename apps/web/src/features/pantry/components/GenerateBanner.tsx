import { FC } from 'react';
import { Button, Group, Paper, Text, ThemeIcon } from '@mantine/core';

import { SparkleIcon } from '@phosphor-icons/react';

interface GenerateBannerProps {
  lowStockCount: number;
  onGenerate: () => void;
}

/** Aviso con el atajo "Generar desde bajo stock"; se muestra solo si hay productos en su mínimo. */
export const GenerateBanner: FC<GenerateBannerProps> = ({ lowStockCount, onGenerate }) => (
  <Paper p="md">
    <Group justify="space-between" wrap="wrap" gap="md">
      <Group gap="sm" wrap="nowrap">
        <ThemeIcon variant="light" color="terracotta" radius="md" size="lg">
          <SparkleIcon size="1.25rem" />
        </ThemeIcon>
        <Text size="sm">
          <strong>
            {lowStockCount} {lowStockCount === 1 ? 'producto con bajo stock' : 'productos con bajo stock'}.
          </strong>{' '}
          Generá la lista y se suman los que faltan.
        </Text>
      </Group>
      <Button variant="light" size="sm" onClick={onGenerate}>
        Generar desde bajo stock
      </Button>
    </Group>
  </Paper>
);
