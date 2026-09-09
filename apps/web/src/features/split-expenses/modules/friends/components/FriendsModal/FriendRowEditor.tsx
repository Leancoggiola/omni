import { FC, useState } from 'react';
import { ActionIcon, Group, Stack, Text, TextInput } from '@mantine/core';

import { getErrorMessage, notifyError, notifySuccess } from '@/shared/ui';

import type { SplitFriend, UpdateSplitFriendPayload } from '@omni/shared/split-expenses';

import { friendFormSchema, SPLIT_FRIEND_ALIAS_MAX, SPLIT_FRIEND_NAME_MAX } from '@omni/shared/split-expenses';
import { CheckIcon, XIcon } from '@phosphor-icons/react';

interface FriendRowEditorProps {
  friend: SplitFriend;
  onUpdate: (friendId: string, payload: UpdateSplitFriendPayload) => Promise<SplitFriend>;
  onDone: () => void;
}

/** Mounted only while editing, so initial values always come from the current friend. */
export const FriendRowEditor: FC<FriendRowEditorProps> = ({ friend, onUpdate, onDone }) => {
  const [name, setName] = useState(friend.name);
  const [alias, setAlias] = useState(friend.alias ?? '');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (loading) return;

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
      onDone();
    } catch (err) {
      notifyError(getErrorMessage(err, 'No se pudo actualizar el amigo'));
    } finally {
      setLoading(false);
    }
  };

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
        <ActionIcon variant="subtle" color="gray" aria-label="Cancelar" onClick={onDone}>
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
};
