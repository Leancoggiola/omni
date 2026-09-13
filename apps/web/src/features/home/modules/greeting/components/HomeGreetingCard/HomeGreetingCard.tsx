import { ActionIcon, Group, Paper, Skeleton, Stack, Text } from '@mantine/core';

import { useAuth } from '@/core/auth';
import { GRADIENTS } from '@/theme/gradients';

import { getTimeGreeting } from '../../utils/getTimeGreeting';

import type { FC } from 'react';

import { SparkleIcon } from '@phosphor-icons/react';

export const HomeGreetingCard: FC = () => {
  const { user, isLoading } = useAuth();
  const greeting = getTimeGreeting();

  return (
    <Paper>
      <Group wrap="nowrap" justify="space-between" align="center">
        <Stack gap="2xs">
          <Text c="dimmed" fz="sm">
            {greeting}
          </Text>
          {isLoading ? (
            <Skeleton height={28} width={160} />
          ) : (
            <Text c="var(--mantine-color-text-primary)" fz="1.5rem" fw={600}>
              {user?.name}
            </Text>
          )}
        </Stack>
        <ActionIcon
          size="3rem"
          radius="full"
          color="terracotta"
          variant="gradient"
          gradient={GRADIENTS.terracotta}
          tabIndex={-1}
          style={{ pointerEvents: 'none', boxShadow: 'var(--mantine-shadow-brand)' }}
        >
          <SparkleIcon size="2rem" weight="fill" aria-hidden />
        </ActionIcon>
      </Group>
    </Paper>
  );
};
