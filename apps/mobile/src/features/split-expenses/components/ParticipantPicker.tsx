import { SPLIT_FRIEND_NAME_MAX } from '@omni/shared/split-expenses';
import { FONT_SIZE, SPACING } from '@omni/shared/theme';
import { PlusIcon, XIcon } from 'phosphor-react-native';
import { useEffect, useRef, useState } from 'react';
import { XStack, YStack, type TamaguiElement } from 'tamagui';

import { useAuth } from '@/core/auth';

import { Button, ErrorState, LoadingState, Paragraph, TextField } from '@/shared/ui';

import { useSplitFriends } from '../hooks/useSplitFriends';
import { toneForName } from '../utils/presentation';
import { ChoiceChip } from './ChoiceChip';
import { ParticipantAvatar } from './ParticipantAvatar';

import type { GatheringParticipantDraft } from '@omni/shared/split-expenses';
import type { TextInputInstance } from 'react-native';

type ParticipantPickerProps = {
  participants: GatheringParticipantDraft[];
  error?: string;
  onToggleFriend: (friendId: string, displayName: string) => void;
  onAddNew: (displayName: string) => void;
  onRemove: (key: string) => void;
};

/**
 * "¿Quiénes participan?": "Vos" fijo, los amigos guardados como chips que se marcan y se desmarcan, y "Amigo nuevo"
 * para sumar a alguien por nombre (queda solo en esa juntada, sin guardarse como amigo). Un nombre repetido no se
 * agrega de nuevo.
 */
export function ParticipantPicker({ participants, error, onToggleFriend, onAddNew, onRemove }: ParticipantPickerProps) {
  const { friends, isLoading, error: friendsError, mutate } = useSplitFriends();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const inputRef = useRef<TamaguiElement>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (adding) (inputRef.current as TextInputInstance | null)?.focus();
  }, [adding]);

  const addNew = () => {
    const trimmed = name.trim();
    const duplicated = participants.some(
      participant => participant.displayName.toLowerCase() === trimmed.toLowerCase()
    );
    if (trimmed && !duplicated) onAddNew(trimmed);
    setName('');
    setAdding(false);
  };

  return (
    <YStack gap={SPACING.xs}>
      <XStack justifyContent="space-between" alignItems="baseline">
        <Paragraph fontSize={FONT_SIZE.md} fontWeight="600">
          ¿Quiénes participan?
        </Paragraph>
        <Paragraph color="dimmed" fontSize={FONT_SIZE.sm}>
          {participants.length === 0 ? '1 persona' : `${participants.length + 1} personas`}
        </Paragraph>
      </XStack>

      <XStack flexWrap="wrap" gap={SPACING.xs}>
        <ChoiceChip label="Vos" selected avatar={<ParticipantAvatar name={user?.name ?? 'Vos'} tone={undefined} />} />
        {friends?.map(friend => (
          <ChoiceChip
            key={friend.id}
            label={friend.name}
            selected={participants.some(participant => participant.friendId === friend.id)}
            avatar={<ParticipantAvatar name={friend.name} tone={toneForName(friend.name)} />}
            onPress={() => onToggleFriend(friend.id, friend.name)}
          />
        ))}
        {participants
          .filter(participant => participant.friendId === null)
          .map(participant => (
            <ChoiceChip
              key={participant.key}
              label={participant.displayName}
              selected
              rightIcon={XIcon}
              accessibilityLabel={`Quitar ${participant.displayName}`}
              onPress={() => onRemove(participant.key)}
            />
          ))}
        {adding ? null : <ChoiceChip label="Amigo nuevo" leftIcon={PlusIcon} onPress={() => setAdding(true)} />}
      </XStack>

      {adding ? (
        <YStack gap={SPACING.xs}>
          <TextField
            label="Nombre del participante"
            placeholder="Nombre"
            ref={inputRef}
            maxLength={SPLIT_FRIEND_NAME_MAX}
            value={name}
            onChangeText={(text: string) => setName(text)}
            onSubmitEditing={addNew}
            returnKeyType="done"
          />
          <Button fullWidth variant="light" onPress={addNew}>
            Agregar participante
          </Button>
        </YStack>
      ) : null}

      {friendsError && !friends ? (
        <ErrorState compact message="No se pudieron cargar tus amigos" onRetry={() => void mutate()} />
      ) : null}
      {isLoading ? <LoadingState size="small" /> : null}

      {error ? (
        <Paragraph color="destructive" fontSize={FONT_SIZE.sm}>
          {error}
        </Paragraph>
      ) : null}
    </YStack>
  );
}
