import { FC, useState } from 'react';
import { Alert, Button, Group, Stack, Text, TextInput } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { schemaResolver, useForm } from '@mantine/form';

import { DISPLAY_DATE_FORMAT } from '@/shared/dates';
import { getErrorMessage } from '@/shared/ui';

import {
  createInitialNewGatheringValues,
  newGatheringFormSchema,
  toCreateGatheringPayload,
} from '../../utils/newGatheringForm';
import { ParticipantPicker } from './ParticipantPicker';

import type { NewGatheringFormValues } from '../../utils/newGatheringForm';
import type { CreateGatheringPayload } from '@omni/shared/split-expenses';

import { appDateKey } from '@omni/shared/common';
import { GATHERING_NAME_MAX } from '@omni/shared/split-expenses';

interface NewGatheringFormProps {
  loading: boolean;
  /** Throws on failure so the form can surface the message. */
  onCreate: (payload: CreateGatheringPayload) => Promise<void>;
  onCancel: () => void;
}

/** Rendered inside the modal, so Mantine unmounts it on close and the form state resets. */
export const NewGatheringForm: FC<NewGatheringFormProps> = ({ loading, onCreate, onCancel }) => {
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<NewGatheringFormValues>({
    mode: 'controlled',
    initialValues: createInitialNewGatheringValues(),
    validate: schemaResolver(newGatheringFormSchema, { sync: true }),
  });

  const handleSubmit = async (values: NewGatheringFormValues) => {
    if (loading) return;

    setSubmitError(null);
    try {
      await onCreate(toCreateGatheringPayload(values));
    } catch (err) {
      setSubmitError(getErrorMessage(err, 'No se pudo crear la juntada'));
    }
  };

  return (
    <form noValidate onSubmit={form.onSubmit(handleSubmit)}>
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Después cargás los gastos en el feed.
        </Text>

        {submitError && <Alert color="destructive">{submitError}</Alert>}

        <TextInput
          label="Nombre"
          placeholder="Asado del sábado"
          required
          maxLength={GATHERING_NAME_MAX}
          {...form.getInputProps('name')}
        />

        <DatePickerInput
          label="Fecha"
          placeholder="dd/mm/aaaa"
          valueFormat={DISPLAY_DATE_FORMAT}
          maxDate={appDateKey()}
          {...form.getInputProps('date')}
        />

        <ParticipantPicker
          participants={form.values.participants}
          error={form.errors.participants as string | undefined}
          onToggleFriend={(friendId, displayName) => {
            const index = form.values.participants.findIndex(participant => participant.friendId === friendId);
            if (index >= 0) form.removeListItem('participants', index);
            else form.insertListItem('participants', { key: crypto.randomUUID(), friendId, displayName });
          }}
          onAddNew={displayName =>
            form.insertListItem('participants', { key: crypto.randomUUID(), friendId: null, displayName })
          }
          onRemove={index => form.removeListItem('participants', index)}
        />

        <Group justify="flex-end" gap="sm" mt="sm">
          <Button variant="outline" type="button" onClick={onCancel} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" loading={loading} disabled={!form.isDirty()}>
            Crear juntada
          </Button>
        </Group>
      </Stack>
    </form>
  );
};
