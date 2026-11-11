import { FC, useState } from 'react';
import { ActionIcon, Group, Stack, Text } from '@mantine/core';

import { confirm, getErrorMessage, notifyError, notifySuccess, UserAvatar } from '@/shared/ui';

import { FriendRowEditor } from './FriendRowEditor';

import type { SplitFriend, UpdateSplitFriendPayload } from '@omni/shared/split-expenses';

import classes from './FriendsModal.module.scss';

import { PencilSimpleIcon, TrashIcon } from '@phosphor-icons/react';

const FRIEND_TONE = 'sage';

interface FriendRowProps {
  friend: SplitFriend;
  onUpdate: (friendId: string, payload: UpdateSplitFriendPayload) => Promise<SplitFriend>;
  onDelete: (friendId: string) => Promise<void>;
}

export const FriendRow: FC<FriendRowProps> = ({ friend, onUpdate, onDelete }) => {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (deleting) return;

    const confirmed = await confirm({
      title: 'Eliminar amigo',
      description: `¿Seguro que querés eliminar a "${friend.name}"?`,
      confirmLabel: 'Eliminar',
      cancelLabel: 'Cancelar',
    });
    if (!confirmed) return;

    setDeleting(true);
    try {
      await onDelete(friend.id);
      notifySuccess('Amigo eliminado');
    } catch (err) {
      notifyError(getErrorMessage(err, 'No se pudo eliminar el amigo'));
    } finally {
      setDeleting(false);
    }
  };

  if (editing) {
    return (
      <FriendRowEditor key={friend.updatedAt} friend={friend} onUpdate={onUpdate} onDone={() => setEditing(false)} />
    );
  }

  return (
    <Group justify="space-between" wrap="nowrap" py="xs" className={classes.row}>
      <Group gap="sm" wrap="nowrap" miw={0}>
        <UserAvatar name={friend.name} color={FRIEND_TONE} />
        <Stack gap="none" miw={0}>
          <Text size="sm" fw={600} truncate>
            {friend.name}
          </Text>
          <Text size="xs" c="dimmed" truncate>
            {friend.alias ?? 'Sin alias'}
          </Text>
        </Stack>
      </Group>
      <Group gap="3xs" wrap="nowrap">
        <ActionIcon
          variant="subtle"
          color="gray"
          aria-label={`Editar a ${friend.name}`}
          onClick={() => setEditing(true)}
        >
          <PencilSimpleIcon size="1rem" />
        </ActionIcon>
        <ActionIcon
          variant="subtle"
          color="destructive"
          aria-label={`Eliminar a ${friend.name}`}
          loading={deleting}
          onClick={handleDelete}
        >
          <TrashIcon size="1rem" />
        </ActionIcon>
      </Group>
    </Group>
  );
};
