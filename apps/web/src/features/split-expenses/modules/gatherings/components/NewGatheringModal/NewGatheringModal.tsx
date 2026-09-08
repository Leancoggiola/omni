import { FC, useEffect, useState } from 'react';
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Combobox,
  Group,
  Modal,
  Stack,
  Text,
  TextInput,
  useCombobox,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { schemaResolver, useForm } from '@mantine/form';
import { useDebouncedValue } from '@mantine/hooks';

import { getErrorMessage, notifySuccess } from '@/shared/ui';

import { useSplitFriendsSuggest } from '../../../friends';
import {
  createInitialNewGatheringValues,
  newGatheringFormSchema,
  toCreateGatheringPayload,
  todayIsoDate,
} from '../../utils/newGatheringForm';

import type { NewGatheringFormValues } from '../../utils/newGatheringForm';
import type { CreateGatheringPayload } from '@omni/shared/split-expenses';

import { GATHERING_NAME_MAX, SPLIT_FRIEND_NAME_MAX } from '@omni/shared/split-expenses';
import { PlusIcon, XIcon } from '@phosphor-icons/react';

interface NewGatheringModalProps {
  opened: boolean;
  onClose: () => void;
  onCreate: (payload: CreateGatheringPayload) => Promise<void>;
}

const FREE_TEXT_VALUE = '__free_text__';

export const NewGatheringModal: FC<NewGatheringModalProps> = ({ opened, onClose, onCreate }) => {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [participantInput, setParticipantInput] = useState('');

  const form = useForm<NewGatheringFormValues>({
    mode: 'controlled',
    initialValues: createInitialNewGatheringValues(),
    validate: schemaResolver(newGatheringFormSchema, { sync: true }),
  });

  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });

  const [debouncedQuery] = useDebouncedValue(participantInput, 300);
  const trimmedQuery = debouncedQuery.trim();
  const { items: suggestions } = useSplitFriendsSuggest(opened ? trimmedQuery : '');

  useEffect(() => {
    if (!opened) {
      form.reset();
      setSubmitError(null);
      setLoading(false);
      setParticipantInput('');
      combobox.resetSelectedOption();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened]);

  const isDuplicate = (name: string) =>
    form.values.participants.some(participant => participant.displayName.toLowerCase() === name.toLowerCase());

  const addParticipant = (friendId: string | null, displayName: string) => {
    const name = displayName.trim();
    if (!name || isDuplicate(name)) {
      setParticipantInput('');
      combobox.closeDropdown();
      return;
    }
    form.insertListItem('participants', { key: crypto.randomUUID(), friendId, displayName: name });
    setParticipantInput('');
    combobox.closeDropdown();
  };

  const handleOptionSubmit = (value: string) => {
    if (value === FREE_TEXT_VALUE) {
      addParticipant(null, participantInput);
      return;
    }
    const friend = suggestions.find(item => item.id === value);
    if (friend) addParticipant(friend.id, friend.name);
  };

  const availableSuggestions = suggestions.filter(friend => !isDuplicate(friend.name));

  const handleSubmit = async (values: NewGatheringFormValues) => {
    setSubmitError(null);
    setLoading(true);
    try {
      await onCreate(toCreateGatheringPayload(values));
      notifySuccess('Juntada creada');
      onClose();
    } catch (err) {
      setSubmitError(getErrorMessage(err, 'No se pudo crear la juntada'));
    } finally {
      setLoading(false);
    }
  };

  const handleModalClose = loading ? () => {} : onClose;

  return (
    <Modal
      opened={opened}
      onClose={handleModalClose}
      title="Nueva juntada"
      centered
      closeOnClickOutside={!loading}
      closeOnEscape={!loading}
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          {submitError && (
            <Alert color="destructive" variant="light">
              {submitError}
            </Alert>
          )}

          <TextInput
            label="Nombre de la juntada"
            placeholder="Asado del sábado"
            required
            maxLength={GATHERING_NAME_MAX}
            {...form.getInputProps('name')}
          />

          <DatePickerInput
            label="Fecha"
            placeholder="dd/mm/aaaa"
            valueFormat="DD/MM/YYYY"
            maxDate={todayIsoDate()}
            {...form.getInputProps('date')}
          />

          <Stack gap="xs">
            <Text size="sm" fw={500}>
              Participantes
            </Text>

            {form.values.participants.length > 0 && (
              <Group gap="xs">
                {form.values.participants.map((participant, index) => (
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
                        onClick={() => form.removeListItem('participants', index)}
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
                    value={participantInput}
                    maxLength={SPLIT_FRIEND_NAME_MAX}
                    onChange={event => {
                      setParticipantInput(event.currentTarget.value);
                      combobox.openDropdown();
                    }}
                    onFocus={() => combobox.openDropdown()}
                    onKeyDown={event => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        addParticipant(null, participantInput);
                      }
                    }}
                  />
                </Combobox.Target>
                <Combobox.Dropdown hidden={participantInput.trim().length === 0}>
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
                    {participantInput.trim().length > 0 && !isDuplicate(participantInput.trim()) && (
                      <Combobox.Option value={FREE_TEXT_VALUE}>
                        <Text size="sm">Agregar &quot;{participantInput.trim()}&quot;</Text>
                      </Combobox.Option>
                    )}
                  </Combobox.Options>
                </Combobox.Dropdown>
              </Combobox>
              <ActionIcon
                variant="gradient"
                size="lg"
                aria-label="Agregar participante"
                onClick={() => addParticipant(null, participantInput)}
              >
                <PlusIcon size="1.1rem" weight="bold" />
              </ActionIcon>
            </Group>

            {form.errors.participants && (
              <Text size="xs" c="red">
                {form.errors.participants}
              </Text>
            )}
          </Stack>

          <Group justify="flex-end" gap="sm" mt="sm">
            <Button variant="default" type="button" onClick={handleModalClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" loading={loading}>
              Crear
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
};
