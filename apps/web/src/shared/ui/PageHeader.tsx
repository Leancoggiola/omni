import { Group, Stack, Text, ThemeIcon } from '@mantine/core';

import { AccentTitle } from './AccentTitle';

import type { FC, ReactNode } from 'react';

interface PageHeaderProps {
  icon: ReactNode;
  title: string;
  accent?: string;
  subtitle?: string;
  /** Rendered on the opposite edge of the header, typically buttons. */
  actions?: ReactNode;
}

/**
 * Encabezado de página de v2: título en `display` con una palabra en `primary`, sin itálica. `accent` es esa
 * palabra (por defecto, la última) y tiene que ser una palabra completa de `title`, tal cual está escrita:
 * `"Perfil,"` no coincide. Si no coincide, o si el título tiene una sola palabra, no se resalta nada.
 */
export const PageHeader: FC<PageHeaderProps> = ({ icon, title, accent, subtitle, actions }) => {
  return (
    <Group justify="space-between" align="center" wrap="wrap" gap="md">
      <Group gap="md" wrap="nowrap">
        <ThemeIcon variant="light" color="terracotta" size="3.5rem" radius="lg">
          {icon}
        </ThemeIcon>
        <Stack gap="3xs">
          <AccentTitle order={1} title={title} accent={accent} />
          {subtitle && (
            <Text c="dimmed" size="md">
              {subtitle}
            </Text>
          )}
        </Stack>
      </Group>
      {actions}
    </Group>
  );
};
