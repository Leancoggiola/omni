import { FC, useState } from 'react';
import { ActionIcon, Group, Stack, Text, TextInput } from '@mantine/core';

import { confirm, getErrorMessage, notifyError, notifySuccess } from '@/shared/ui';

import type { SplitFriend, UpdateSplitFriendPayload } from '@omni/shared/split-expenses';

import { friendFormSchema, SPLIT_FRIEND_ALIAS_MAX, SPLIT_FRIEND_NAME_MAX } from '@omni/shared/split-expenses';
import { CheckIcon, PencilSimpleIcon, TrashIcon, XIcon } from '@phosphor-icons/react';

interface FriendRowProps {
  friend: SplitFriend;
  onUpdate: (friendId: string, payload: UpdateSplitFriendPayload) => Promise<SplitFriend>;
  onDelete: (friendId: string) => Promise<void>;
}

export const FriendRow: FC<FriendRowProps> = ({ friend, onUpdate, onDelete }) => {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(friend.name);
  const [alias, setAlias] = useState(friend.alias ?? '');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const startEditing = () => {
    setName(friend.name);
    setAlias(friend.alias ?? '');
    setError(null);
    setEditing(true);
  };

  const handleSave = async () => {
    const trimmedName = name.trim();
    const trimmedAlias = alias.trim();

    const result = friendFormSchema.safeParse({ name: trimmedName, alias: trimmedAlias });
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Datos inválidos');
      return;
    }
    setError(null);

    setLoading(true);
    try {
      await onUpdate(friend.id, { name: trimmedName, alias: trimmedAlias });
      notifySuccess('Amigo actualizado');
      setEditing(false);
    } catch (err) {
      notifyError(getErrorMessage(err, 'No se pudo actualizar el amigo'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: 'Eliminar amigo',
      description: `¿Seguro que querés eliminar a "${friend.name}"?`,
      confirmLabel: 'Eliminar',
      cancelLabel: 'Cancelar',
    });
    if (!confirmed) return;

    setLoading(true);
    try {
      await onDelete(friend.id);
      notifySuccess('Amigo eliminado');
    } catch (err) {
      notifyError(getErrorMessage(err, 'No se pudo eliminar el amigo'));
      setLoading(false);
    }
  };

  if (editing) {
    return (
      <Stack gap={4}>
        <Group gap="xs" align="flex-start" wrap="nowrap">
          <TextInput
            aria-label="Nombre"
            value={name}
            maxLength={SPLIT_FRIEND_NAME_MAX}
            onChange={event => setName(event.currentTarget.value)}
            style={{ flex: 1 }}
          />
          <TextInput
            aria-label="Alias"
            placeholder="Alias"
            value={alias}
            maxLength={SPLIT_FRIEND_ALIAS_MAX}
            onChange={event => setAlias(event.currentTarget.value)}
            style={{ flex: 1 }}
          />
          <ActionIcon
            variant="light"
            color="green"
            aria-label="Guardar"
            loading={loading}
            disabled={!name.trim() || !alias.trim()}
            onClick={handleSave}
          >
            <CheckIcon size="1rem" />
          </ActionIcon>
          <ActionIcon variant="subtle" color="gray" aria-label="Cancelar" onClick={() => setEditing(false)}>
            <XIcon size="1rem" />
          </ActionIcon>
        </Group>
        {error && (
          <Text size="xs" c="red">
            {error}
          </Text>
        )}
      </Stack>
    );
  }

  return (
    <Group justify="space-between" wrap="nowrap">
      <Stack gap={0}>
        <Text size="sm" fw={600}>
          {friend.name}
        </Text>
        {friend.alias && (
          <Text size="xs" c="dimmed">
            {friend.alias}
          </Text>
        )}
      </Stack>
      <Group gap="3xs" wrap="nowrap">
        <ActionIcon variant="subtle" color="gray" aria-label="Editar" onClick={startEditing}>
          <PencilSimpleIcon size="1rem" />
        </ActionIcon>
        <ActionIcon variant="subtle" color="red" aria-label="Eliminar" loading={loading} onClick={handleDelete}>
          <TrashIcon size="1rem" />
        </ActionIcon>
      </Group>
    </Group>
  );
};
