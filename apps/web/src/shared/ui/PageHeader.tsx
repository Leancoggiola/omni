import { Group, Stack, Text, ThemeIcon, Title } from '@mantine/core';

import { useDisplayStyles } from './useDisplayStyles';

import type { FC, ReactNode } from 'react';

interface PageHeaderProps {
  icon: ReactNode;
  title: string;
  accent?: string;
  subtitle?: string;
  /** Rendered on the opposite edge of the header, typically buttons. */
  actions?: ReactNode;
}

/** Parte `title` en [antes, acento, después]; sin acento válido, el título entero queda sin resaltar. */
function splitAccent(title: string, accent?: string): [string, string, string] {
  const words = title.trim().split(/\s+/);
  const clean = words.join(' ');
  if (words.length < 2) return [clean, '', ''];
  const index = accent === undefined ? words.length - 1 : words.lastIndexOf(accent);
  if (index < 0) return [clean, '', ''];
  return [
    index > 0 ? `${words.slice(0, index).join(' ')} ` : '',
    words[index] ?? '',
    index < words.length - 1 ? ` ${words.slice(index + 1).join(' ')}` : '',
  ];
}

/**
 * Encabezado de página de v2: título en `display` con una palabra en `primary`, sin itálica. `accent` es esa palabra
 * (por defecto, la última) y tiene que ser una palabra completa de `title`; un título de una sola palabra no se resalta.
 */
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
              <Text span inherit c="var(--mantine-color-text-primary)">
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
