import { FC, useState } from 'react';
import { Button, Stack } from '@mantine/core';

import { EmptyState, ErrorState, LoadingState } from '@/shared/ui';

import { useSplitExpensesMutations } from './hooks/useSplitExpensesMutations';
import { FriendsModal } from './modules/friends/components/FriendsModal/FriendsModal';
import { GatheringList } from './modules/gatherings/components/GatheringList/GatheringList';
import { GatheringWorkspace } from './modules/gatherings/components/GatheringWorkspace';
import { NewGatheringModal } from './modules/gatherings/components/NewGatheringModal/NewGatheringModal';
import { SplitExpensesHeader } from './modules/gatherings/components/SplitExpensesHeader';
import { useGatherings } from './modules/gatherings/hooks/useGatherings';

import type { CreateGatheringPayload } from '@omni/shared/split-expenses';

import classes from './split-expenses.module.scss';

import { PlusIcon, UsersThreeIcon } from '@phosphor-icons/react';

/**
 * Gastos compartidos en tres paneles: lista de juntadas, feed de la elegida y "Saldar cuentas". La elegida es la
 * última que clickeó el usuario o, si ya no existe (se borró) o todavía no eligió, la primera de la lista.
 */
export const SplitExpensesPage: FC = () => {
  const [friendsOpened, setFriendsOpened] = useState(false);
  const [newGatheringOpened, setNewGatheringOpened] = useState(false);
  const [pickedId, setPickedId] = useState<string | null>(null);

  const { items, isLoading, error, mutate } = useGatherings();
  const { createGathering } = useSplitExpensesMutations();

  const selected = items.find(item => item.id === pickedId) ?? items[0] ?? null;

  const handleCreateGathering = async (payload: CreateGatheringPayload) => {
    const created = await createGathering(payload);
    setPickedId(created.id);
  };

  return (
    <Stack gap="lg">
      <SplitExpensesHeader
        onOpenFriends={() => setFriendsOpened(true)}
        onNewGathering={() => setNewGatheringOpened(true)}
      />

      {error ? (
        <ErrorState message="No se pudieron cargar las juntadas" onRetry={() => mutate()} />
      ) : isLoading && items.length === 0 ? (
        <LoadingState />
      ) : !selected ? (
        <EmptyState
          icon={<UsersThreeIcon />}
          title="Todavía no tenés juntadas"
          action={
            <Button variant="light" leftSection={<PlusIcon size="1rem" />} onClick={() => setNewGatheringOpened(true)}>
              Nueva juntada
            </Button>
          }
        />
      ) : (
        <div className={classes.layout}>
          <GatheringList items={items} selectedId={selected.id} onSelect={setPickedId} />
          <GatheringWorkspace key={selected.id} gatheringId={selected.id} />
        </div>
      )}

      <NewGatheringModal
        opened={newGatheringOpened}
        onClose={() => setNewGatheringOpened(false)}
        onCreate={handleCreateGathering}
      />

      <FriendsModal opened={friendsOpened} onClose={() => setFriendsOpened(false)} />
    </Stack>
  );
};
