import { FC, useState } from 'react';
import { Stack } from '@mantine/core';

import {
  FriendsModal,
  GatheringList,
  NewGatheringModal,
  SplitExpensesHeader,
  useGatherings,
  useSplitExpensesMutations,
} from './modules';

import type { CreateGatheringPayload } from '@omni/shared/split-expenses';

export const SplitExpensesPage: FC = () => {
  const [friendsOpened, setFriendsOpened] = useState(false);
  const [newGatheringOpened, setNewGatheringOpened] = useState(false);

  const { items, isLoading } = useGatherings();
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

      <GatheringList items={items} isLoading={isLoading} onNewGathering={() => setNewGatheringOpened(true)} />

      <NewGatheringModal
        opened={newGatheringOpened}
        onClose={() => setNewGatheringOpened(false)}
        onCreate={handleCreateGathering}
      />

      <FriendsModal opened={friendsOpened} onClose={() => setFriendsOpened(false)} />
    </Stack>
  );
};
