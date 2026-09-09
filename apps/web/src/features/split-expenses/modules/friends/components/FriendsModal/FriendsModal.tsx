import { FC } from 'react';
import { Divider, Modal, Stack } from '@mantine/core';

import { EmptyState, ErrorState, LoadingState, notifySuccess } from '@/shared/ui';

import { useSplitExpensesMutations } from '../../../_shared';
import { useSplitFriends } from '../../hooks';
import { FriendForm } from './FriendForm';
import { FriendRow } from './FriendRow';

import type { CreateSplitFriendPayload } from '@omni/shared/split-expenses';

import { UsersThreeIcon } from '@phosphor-icons/react';

interface FriendsModalProps {
  opened: boolean;
  onClose: () => void;
}

export const FriendsModal: FC<FriendsModalProps> = ({ opened, onClose }) => {
  const { items: friends, isLoading, error } = useSplitFriends();
  const { createFriend, updateFriend, deleteFriend } = useSplitExpensesMutations();

  const handleCreate = async (payload: CreateSplitFriendPayload) => {
    await createFriend(payload);
    notifySuccess('Amigo guardado');
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Amigos guardados" centered>
      <Stack gap="md">
        {error ? (
          <ErrorState message="No se pudieron cargar los amigos" />
        ) : isLoading ? (
          <LoadingState size="sm" py="md" />
        ) : friends.length === 0 ? (
          <EmptyState icon={<UsersThreeIcon />} title="Sin amigos guardados" />
        ) : (
          <Stack gap="xs">
            {friends.map(friend => (
              <FriendRow key={friend.id} friend={friend} onUpdate={updateFriend} onDelete={deleteFriend} />
            ))}
          </Stack>
        )}

        <Divider />

        <FriendForm onCreate={handleCreate} />
      </Stack>
    </Modal>
  );
};
