import { FC, useState } from 'react';
import { Alert, Button, Group, Stack, Text, TextInput } from '@mantine/core';
import { schemaResolver, useForm } from '@mantine/form';

import { getErrorMessage } from '@/shared/ui';

import { friendFormSchema, INITIAL_FRIEND_FORM_VALUES, toCreateFriendPayload } from '../../utils/friendForm';

import type { FriendFormValues } from '../../utils/friendForm';
import type { CreateSplitFriendPayload } from '@omni/shared/split-expenses';

import { SPLIT_FRIEND_ALIAS_MAX, SPLIT_FRIEND_NAME_MAX } from '@omni/shared/split-expenses';

interface FriendFormProps {
  /** Throws on failure so the form can surface the message. */
  onCreate: (payload: CreateSplitFriendPayload) => Promise<void>;
}

export const FriendForm: FC<FriendFormProps> = ({ onCreate }) => {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const form = useForm<FriendFormValues>({
    mode: 'controlled',
    initialValues: INITIAL_FRIEND_FORM_VALUES,
    validate: schemaResolver(friendFormSchema, { sync: true }),
  });

  const handleSubmit = async (values: FriendFormValues) => {
    if (loading) return;

    setSubmitError(null);
    setLoading(true);
    try {
      await onCreate(toCreateFriendPayload(values));
      form.reset();
    } catch (err) {
      setSubmitError(getErrorMessage(err, 'No se pudo guardar el amigo'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Stack gap="sm">
        <Text size="xs" fw={700} c="dimmed" tt="uppercase">
          Agregar amigo
        </Text>

        {submitError && (
          <Alert color="destructive" variant="light">
            {submitError}
          </Alert>
        )}

        <TextInput placeholder="Nombre" required maxLength={SPLIT_FRIEND_NAME_MAX} {...form.getInputProps('name')} />
        <TextInput placeholder="Alias" required maxLength={SPLIT_FRIEND_ALIAS_MAX} {...form.getInputProps('alias')} />

        <Group justify="flex-end">
          <Button type="submit" fullWidth loading={loading}>
            Guardar amigo
          </Button>
        </Group>
      </Stack>
    </form>
  );
};
