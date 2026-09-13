import { Group, Stack, Text, ThemeIcon, Title } from '@mantine/core';

import type { FC, ReactNode } from 'react';

interface PageHeaderProps {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  /** Rendered on the opposite edge of the header, typically buttons. */
  actions?: ReactNode;
}

export const PageHeader: FC<PageHeaderProps> = ({ icon, title, subtitle, actions }) => (
  <Group justify="space-between" align="center" wrap="wrap" gap="md">
    <Group gap="sm" wrap="nowrap">
      <ThemeIcon variant="light" color="terracotta" size="2.75rem" radius="md">
        {icon}
      </ThemeIcon>
      <Stack gap="3xs">
        <Title order={1}>{title}</Title>
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
