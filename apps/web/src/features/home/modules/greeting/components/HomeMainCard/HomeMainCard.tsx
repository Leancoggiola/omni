import { Avatar, Group, Paper, SimpleGrid, Skeleton, Stack, Text, Title } from '@mantine/core';

import { useAuth } from '@/core/auth';
import { GRADIENTS } from '@/theme/gradients';

import { getTimeGreeting } from '../../utils/getTimeGreeting';
import { HolidaysCard } from '../HolidaysCard';

import type { FC } from 'react';

import { SparkleIcon } from '@phosphor-icons/react';

export const HomeMainCard: FC = () => {
  const { user, isLoading } = useAuth();
  const greeting = getTimeGreeting();

  return (
    <Paper>
      <Stack>
        <Group wrap="nowrap" justify="space-between" align="center">
          <Stack gap="2xs">
            <Text c="dimmed" size="sm">
              {greeting}
            </Text>
            {isLoading ? (
              <Skeleton height={28} width={160} />
            ) : (
              <Title order={3} c="brand">
                {user?.name}
              </Title>
            )}
          </Stack>
          <Avatar size="md" variant="gradient" gradient={GRADIENTS.brand}>
            <SparkleIcon size="1.75rem" weight="fill" aria-hidden />
          </Avatar>
        </Group>
        <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
          <HolidaysCard />
        </SimpleGrid>
      </Stack>
    </Paper>
  );
};
