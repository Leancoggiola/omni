import { FC, useState } from 'react';
import { Alert, Button, Group, Stack, TextInput } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { schemaResolver, useForm } from '@mantine/form';

import { getErrorMessage } from '@/shared/ui';

import {
  createInitialNewGatheringValues,
  newGatheringFormSchema,
  toCreateGatheringPayload,
  todayIsoDate,
} from '../../utils/newGatheringForm';
import { ParticipantPicker } from './ParticipantPicker';

import type { NewGatheringFormValues } from '../../utils/newGatheringForm';
import type { CreateGatheringPayload } from '@omni/shared/split-expenses';

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

        <ParticipantPicker
          participants={form.values.participants}
          error={form.errors.participants as string | undefined}
          onAdd={(friendId, displayName) =>
            form.insertListItem('participants', { key: crypto.randomUUID(), friendId, displayName })
          }
          onRemove={index => form.removeListItem('participants', index)}
        />

        <Group justify="flex-end" gap="sm" mt="sm">
          <Button variant="default" type="button" onClick={onCancel} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" loading={loading}>
            Crear
          </Button>
        </Group>
      </Stack>
    </form>
  );
};
