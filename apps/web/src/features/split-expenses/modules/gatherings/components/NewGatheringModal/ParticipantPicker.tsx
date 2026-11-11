import { FC, useState } from 'react';
import { ActionIcon, Badge, Button, Chip, Group, Input, Stack, Text, TextInput } from '@mantine/core';

import { ErrorState, LoadingState } from '@/shared/ui';

import { useSplitFriends } from '../../../friends/hooks/useSplitFriends';
import { ParticipantAvatar } from '../ParticipantAvatar';

import type { GatheringParticipantDraft } from '../../utils/newGatheringForm';

import classes from './ParticipantPicker.module.scss';

import { SPLIT_FRIEND_NAME_MAX } from '@omni/shared/split-expenses';
import { PlusIcon, XIcon } from '@phosphor-icons/react';

interface ParticipantPickerProps {
  participants: GatheringParticipantDraft[];
  onToggleFriend: (friendId: string, displayName: string) => void;
  onAddNew: (displayName: string) => void;
  onRemove: (index: number) => void;
  error?: string;
}

/**
 * "¿Quiénes participan?": "Vos" fijo, los amigos guardados como chips que se marcan y se desmarcan, y "Amigo nuevo"
 * para sumar a alguien por nombre (queda solo en esa juntada, sin guardarse como amigo).
 */
export const ParticipantPicker: FC<ParticipantPickerProps> = ({
  participants,
  onToggleFriend,
  onAddNew,
  onRemove,
  error,
}) => {
  const [adding, setAdding] = useState(false);
  const [input, setInput] = useState('');
  const { items: friends, isLoading, error: friendsError, mutate } = useSplitFriends();

  const freeParticipants = participants
    .map((participant, index) => ({ participant, index }))
    .filter(({ participant }) => participant.friendId === null);

  const isDuplicate = (name: string) =>
    participants.some(participant => participant.displayName.toLowerCase() === name.toLowerCase());

  const addNew = () => {
    const name = input.trim();
    if (name && !isDuplicate(name)) onAddNew(name);
    setInput('');
    setAdding(false);
  };

  return (
    <Stack gap="xs">
      <Group justify="space-between" align="baseline">
        <Input.Label>¿Quiénes participan?</Input.Label>
        <Text size="xs" c="dimmed">
          {participants.length + 1} personas
        </Text>
      </Group>

      <Group gap="xs">
        <Badge
          variant="light"
          size="lg"
          tt="none"
          leftSection={<ParticipantAvatar name="Vos" tone={undefined} size="1.5rem" />}
        >
          Vos
        </Badge>

        {friends.map(friend => (
          <Chip
            key={friend.id}
            checked={participants.some(participant => participant.friendId === friend.id)}
            onChange={() => onToggleFriend(friend.id, friend.name)}
          >
            {friend.name}
          </Chip>
        ))}

        {freeParticipants.map(({ participant, index }) => (
          <Badge
            key={participant.key}
            variant="light"
            color="brand"
            size="lg"
            tt="none"
            rightSection={
              <ActionIcon
                variant="transparent"
                color="brand"
                size="xs"
                aria-label={`Quitar ${participant.displayName}`}
                onClick={() => onRemove(index)}
              >
                <XIcon size="0.8rem" />
              </ActionIcon>
            }
          >
            {participant.displayName}
          </Badge>
        ))}

        {!adding && (
          <button type="button" className={classes.newFriend} onClick={() => setAdding(true)}>
            <PlusIcon size="1rem" />
            Amigo nuevo
          </button>
        )}
      </Group>

      {adding && (
        <Group gap="xs" align="flex-start" wrap="nowrap">
          <TextInput
            style={{ flex: 1 }}
            aria-label="Nombre del participante"
            placeholder="Nombre"
            value={input}
            maxLength={SPLIT_FRIEND_NAME_MAX}
            data-autofocus
            onChange={event => setInput(event.currentTarget.value)}
            onKeyDown={event => {
              if (event.key === 'Enter') {
                event.preventDefault();
                addNew();
              }
            }}
          />
          <Button type="button" variant="light" aria-label="Agregar participante" onClick={addNew}>
            Agregar
          </Button>
        </Group>
      )}

      {friendsError ? (
        <ErrorState message="No se pudieron cargar tus amigos" onRetry={() => mutate()} />
      ) : (
        isLoading && <LoadingState size="sm" py="xs" />
      )}

      {error && (
        <Text size="xs" c="error">
          {error}
        </Text>
      )}
    </Stack>
  );
};
