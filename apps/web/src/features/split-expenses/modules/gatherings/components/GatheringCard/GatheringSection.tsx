import { FC, ReactNode, useId } from 'react';
import { Stack, Text } from '@mantine/core';

interface GatheringSectionProps {
  label: string;
  children: ReactNode;
}

export const GatheringSection: FC<GatheringSectionProps> = ({ label, children }) => {
  const labelId = useId();

  return (
    <Stack gap="xs" role="group" aria-labelledby={labelId}>
      <Text id={labelId} size="xs" fw={700} c="dimmed" tt="uppercase">
        {label}
      </Text>
      {children}
    </Stack>
  );
};
