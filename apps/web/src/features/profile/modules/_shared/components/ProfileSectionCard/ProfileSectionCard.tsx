import { Paper, Stack, Text, Title } from '@mantine/core';

import type { FC, ReactNode } from 'react';

interface ProfileSectionCardProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  /** Set when this card sits inside another Paper (same bg) so the boundary stays visible. */
  nested?: boolean;
}

export const ProfileSectionCard: FC<ProfileSectionCardProps> = ({ title, subtitle, children, nested }) => (
  <Paper shadow={nested ? 'none' : 'sm'} withBorder={nested}>
    <Stack gap="lg">
      <Stack gap="2xs">
        <Title order={4} fw={600}>
          {title}
        </Title>
        <Text c="dimmed" size="sm">
          {subtitle}
        </Text>
      </Stack>
      {children}
    </Stack>
  </Paper>
);
