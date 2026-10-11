import { Paper, SimpleGrid, Skeleton, Stack, Text, Title } from '@mantine/core';

import { useAuth } from '@/core/auth';

import { getTimeGreeting } from '../../utils/getTimeGreeting';
import { HolidaysCard } from '../HolidaysCard';

import type { FC } from 'react';

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
            <Skeleton height={28} width={160} />
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
