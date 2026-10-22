import { Paper, SimpleGrid, Skeleton, Stack, Text, Title } from '@mantine/core';

import { useAuth } from '@/core/auth';

import { HolidaysCard } from '../HolidaysCard';

import type { FC } from 'react';

import { getTimeGreeting } from '@omni/shared/common';

export const HomeMainCard: FC = () => {
  const { user, isLoading } = useAuth();
  const greeting = getTimeGreeting();

  return (
    <Paper>
      <Stack>
        <Stack gap="2xs">
          <Text c="dimmed" size="sm">
            {greeting}
          </Text>
          {isLoading ? (
            <Skeleton height="1.75rem" width="10rem" />
          ) : (
            <Title order={3} c="brand">
              {user?.name}
            </Title>
          )}
        </Stack>
        <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
          <HolidaysCard />
        </SimpleGrid>
      </Stack>
    </Paper>
  );
};
