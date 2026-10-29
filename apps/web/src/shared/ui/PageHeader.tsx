import { Group, Stack, Text, ThemeIcon, Title } from '@mantine/core';

import { useDisplayStyles } from './useDisplayStyles';

import type { FC, ReactNode } from 'react';

interface PageHeaderProps {
  icon: ReactNode;
  title: string;
  /** Palabra del título que va en `primary`; por defecto, la última. Tiene que estar dentro de `title`. */
  accent?: string;
  subtitle?: string;
  /** Rendered on the opposite edge of the header, typically buttons. */
  actions?: ReactNode;
}

/** Parte `title` en [antes, acento, después]; sin acento válido, el título entero queda sin resaltar. */
function splitAccent(title: string, accent?: string): [string, string, string] {
  const word = accent ?? title.trim().split(/\s+/).pop() ?? '';
  const index = word ? title.lastIndexOf(word) : -1;
  if (index < 0 || title.trim().split(/\s+/).length < 2) return [title, '', ''];
  return [title.slice(0, index), word, title.slice(index + word.length)];
}

/** Encabezado de página de v2: título en `display` con una palabra en `primary`, sin itálica. */
export const PageHeader: FC<PageHeaderProps> = ({ icon, title, accent, subtitle, actions }) => {
  const display = useDisplayStyles('xl');
  const [before, highlighted, after] = splitAccent(title, accent);

  return (
    <Group justify="space-between" align="center" wrap="wrap" gap="md">
      <Group gap="md" wrap="nowrap">
        <ThemeIcon variant="light" color="terracotta" size="3.5rem" radius="lg">
          {icon}
        </ThemeIcon>
        <Stack gap="3xs">
          <Title order={1} {...display}>
            {before}
            {highlighted && (
              <Text span inherit c="var(--mantine-color-text-primary)" data-testid="page-header-accent">
                {highlighted}
              </Text>
            )}
            {after}
          </Title>
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
