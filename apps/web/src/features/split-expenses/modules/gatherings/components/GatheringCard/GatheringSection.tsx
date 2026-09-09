import { FC, ReactNode } from 'react';
import { Stack, Text } from '@mantine/core';

interface GatheringSectionProps {
  label: string;
  children: ReactNode;
}

export const GatheringSection: FC<GatheringSectionProps> = ({ label, children }) => (
  <Stack gap="xs">
    <Text size="xs" fw={700} c="dimmed" tt="uppercase">
      {label}
    </Text>
    {children}
  </Stack>
);
