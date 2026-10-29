import { FC, useState } from 'react';
import { Stack } from '@mantine/core';

import { useSplitExpensesMutations } from './hooks/useSplitExpensesMutations';
import { FriendsModal } from './modules/friends/components/FriendsModal/FriendsModal';
import { GatheringList } from './modules/gatherings/components/GatheringList';
import { NewGatheringModal } from './modules/gatherings/components/NewGatheringModal/NewGatheringModal';
import { SplitExpensesHeader } from './modules/gatherings/components/SplitExpensesHeader';
import { useGatherings } from './modules/gatherings/hooks/useGatherings';

import type { CreateGatheringPayload } from '@omni/shared/split-expenses';

export const SplitExpensesPage: FC = () => {
  const [friendsOpened, setFriendsOpened] = useState(false);
  const [newGatheringOpened, setNewGatheringOpened] = useState(false);

  const { items, isLoading, error, mutate } = useGatherings();
  const { createGathering } = useSplitExpensesMutations();

  const handleCreateGathering = async (payload: CreateGatheringPayload) => {
    await createGathering(payload);
  };

  return (
    <Stack gap="lg">
      <SplitExpensesHeader
        onOpenFriends={() => setFriendsOpened(true)}
        onNewGathering={() => setNewGatheringOpened(true)}
      />

      <GatheringList
        items={items}
        isLoading={isLoading}
        error={error}
        onRetry={() => mutate()}
        onNewGathering={() => setNewGatheringOpened(true)}
      />

      <NewGatheringModal
        opened={newGatheringOpened}
        onClose={() => setNewGatheringOpened(false)}
        onCreate={handleCreateGathering}
      />

      <FriendsModal opened={friendsOpened} onClose={() => setFriendsOpened(false)} />
    </Stack>
  );
};
