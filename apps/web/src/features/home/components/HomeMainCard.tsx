import { Paper, SimpleGrid, Skeleton, Stack, Text, Title } from '@mantine/core';

import { useAuth } from '@/core/auth';
import { useDisplayStyles } from '@/shared/ui';

import { HolidaysCard } from './HolidaysCard/HolidaysCard';

import type { FC } from 'react';

import { getTimeGreeting } from '@omni/shared/common';

export const HomeMainCard: FC = () => {
  const { user, isLoading } = useAuth();
  const greeting = getTimeGreeting();
  const display = useDisplayStyles('xl');

  return (
    <Paper p="xl">
      <Stack gap="lg">
        <Title order={1} fz="md" fw="inherit">
          <Stack gap="3xs" component="span">
            <Text span c="dimmed" size="md" fw={500}>
              {greeting}
            </Text>
            {isLoading ? (
              <Skeleton component="span" display="block" height="3.25rem" width="14rem" />
            ) : (
              <Text span c="var(--mantine-color-text-primary)" {...display} fz="3rem" lh="3.25rem">
                {user?.name}
              </Text>
            )}
          </Stack>
        </Title>
        <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
          <HolidaysCard />
        </SimpleGrid>
      </Stack>
    </Paper>
  );
};
