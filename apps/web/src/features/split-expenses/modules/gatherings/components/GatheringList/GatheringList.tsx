import { FC } from 'react';
import { Button, EmptyState, Loader, Paper, Stack } from '@mantine/core';

import { GatheringCard } from '../GatheringCard';

import type { GatheringSummary } from '@omni/shared/split-expenses';

import { PlusIcon, UsersThreeIcon } from '@phosphor-icons/react';

interface GatheringListProps {
  items: GatheringSummary[];
  isLoading: boolean;
  onNewGathering: () => void;
}

export const GatheringList: FC<GatheringListProps> = ({ items, isLoading, onNewGathering }) => {
  if (isLoading && items.length === 0) {
    return (
      <Stack align="center" py="xl">
        <Loader size="sm" />
      </Stack>
    );
  }

  if (items.length === 0) {
    return (
      <Paper p="xl" radius="md" withBorder>
        <EmptyState
          icon={<UsersThreeIcon />}
          title="Todavía no tenés juntadas"
          withIndicatorBackground
          size="md"
          align="center"
        >
          <EmptyState.Actions>
            <Button variant="light" leftSection={<PlusIcon size="1rem" />} onClick={onNewGathering}>
              Nueva juntada
            </Button>
          </EmptyState.Actions>
        </EmptyState>
      </Paper>
    );
  }

  return (
    <Stack gap="md">
      {items.map(item => (
        <GatheringCard key={item.id} summary={item} />
      ))}
    </Stack>
  );
};
