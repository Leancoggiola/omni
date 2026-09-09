import { FC } from 'react';
import { Button, Stack } from '@mantine/core';

import { EmptyState, ErrorState, LoadingState } from '@/shared/ui';

import { GatheringCard } from '../GatheringCard';

import type { GatheringSummary } from '@omni/shared/split-expenses';

import { PlusIcon, UsersThreeIcon } from '@phosphor-icons/react';

interface GatheringListProps {
  items: GatheringSummary[];
  isLoading: boolean;
  error?: unknown;
  onNewGathering: () => void;
}

export const GatheringList: FC<GatheringListProps> = ({ items, isLoading, error, onNewGathering }) => {
  if (error) {
    return <ErrorState message="No se pudieron cargar las juntadas" />;
  }

  if (isLoading && items.length === 0) {
    return <LoadingState />;
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<UsersThreeIcon />}
        title="Todavía no tenés juntadas"
        action={
          <Button variant="light" leftSection={<PlusIcon size="1rem" />} onClick={onNewGathering}>
            Nueva juntada
          </Button>
        }
      />
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
