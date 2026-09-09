import { FC, useState } from 'react';
import { ActionIcon, Badge, Combobox, Group, Stack, Text, TextInput, useCombobox } from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';

import { useSplitFriendsSuggest } from '../../../friends';

import type { GatheringParticipantDraft } from '@omni/shared/split-expenses';

import { SPLIT_FRIEND_NAME_MAX } from '@omni/shared/split-expenses';
import { PlusIcon, XIcon } from '@phosphor-icons/react';

const FREE_TEXT_VALUE = '__free_text__';

interface ParticipantPickerProps {
  participants: GatheringParticipantDraft[];
  onAdd: (friendId: string | null, displayName: string) => void;
  onRemove: (index: number) => void;
  error?: string;
}

export const ParticipantPicker: FC<ParticipantPickerProps> = ({ participants, onAdd, onRemove, error }) => {
  const [input, setInput] = useState('');

  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });

  const [debouncedQuery] = useDebouncedValue(input, 300);
  const { items: suggestions } = useSplitFriendsSuggest(debouncedQuery.trim());

  const isDuplicate = (name: string) =>
    participants.some(participant => participant.displayName.toLowerCase() === name.toLowerCase());

  const addParticipant = (friendId: string | null, displayName: string) => {
    const name = displayName.trim();
    if (name && !isDuplicate(name)) onAdd(friendId, name);
    setInput('');
    combobox.closeDropdown();
  };

  const handleOptionSubmit = (value: string) => {
    if (value === FREE_TEXT_VALUE) {
      addParticipant(null, input);
      return;
    }
    const friend = suggestions.find(item => item.id === value);
    if (friend) addParticipant(friend.id, friend.name);
  };

  const trimmedInput = input.trim();
  const availableSuggestions = suggestions.filter(friend => !isDuplicate(friend.name));

  return (
    <Stack gap="xs">
      <Text size="sm" fw={500}>
        Participantes
      </Text>

      {participants.length > 0 && (
        <Group gap="xs">
          {participants.map((participant, index) => (
            <Badge
              key={participant.key}
              variant="light"
              color="brand"
              size="lg"
              radius="sm"
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
        </Group>
      )}

      <Group gap="xs" align="flex-start" wrap="nowrap">
        <Combobox store={combobox} onOptionSubmit={handleOptionSubmit} withinPortal={false}>
          <Combobox.Target>
            <TextInput
              style={{ flex: 1 }}
              placeholder="Nombre o alias"
              value={input}
              maxLength={SPLIT_FRIEND_NAME_MAX}
              onChange={event => {
                setInput(event.currentTarget.value);
                combobox.openDropdown();
              }}
              onFocus={() => combobox.openDropdown()}
              onKeyDown={event => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  addParticipant(null, input);
                }
              }}
            />
          </Combobox.Target>
          <Combobox.Dropdown hidden={trimmedInput.length === 0}>
            <Combobox.Options>
              {availableSuggestions.map(friend => (
                <Combobox.Option key={friend.id} value={friend.id}>
                  <Text size="sm">
                    {friend.name}
                    {friend.alias ? (
                      <Text span c="dimmed" size="sm">
                        {' '}
                        ({friend.alias})
                      </Text>
                    ) : null}
                  </Text>
                </Combobox.Option>
              ))}
              {trimmedInput.length > 0 && !isDuplicate(trimmedInput) && (
                <Combobox.Option value={FREE_TEXT_VALUE}>
                  <Text size="sm">Agregar &quot;{trimmedInput}&quot;</Text>
                </Combobox.Option>
              )}
            </Combobox.Options>
          </Combobox.Dropdown>
        </Combobox>
        <ActionIcon
          variant="gradient"
          size="lg"
          aria-label="Agregar participante"
          onClick={() => addParticipant(null, input)}
        >
          <PlusIcon size="1.1rem" weight="bold" />
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
