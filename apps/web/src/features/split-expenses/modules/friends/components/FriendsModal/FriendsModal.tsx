import { FC, useEffect, useState } from 'react';
import { Alert, Button, Divider, Group, Modal, Stack, Text, TextInput } from '@mantine/core';
import { schemaResolver, useForm } from '@mantine/form';

import { getErrorMessage, notifySuccess } from '@/shared/ui';
import { EmptyState, ErrorState, LoadingState } from '@/shared/ui';

import { useSplitExpensesMutations } from '../../../_shared';
import { useSplitFriends } from '../../hooks';
import { friendFormSchema, INITIAL_FRIEND_FORM_VALUES, toCreateFriendPayload } from '../../utils/friendForm';
import { FriendRow } from './FriendRow';

import type { FriendFormValues } from '../../utils/friendForm';

import { SPLIT_FRIEND_ALIAS_MAX, SPLIT_FRIEND_NAME_MAX } from '@omni/shared/split-expenses';
import { UsersThreeIcon } from '@phosphor-icons/react';

interface FriendsModalProps {
  opened: boolean;
  onClose: () => void;
}

export const FriendsModal: FC<FriendsModalProps> = ({ opened, onClose }) => {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { items: friends, isLoading, error } = useSplitFriends();
  const { createFriend, updateFriend, deleteFriend } = useSplitExpensesMutations();

  const form = useForm<FriendFormValues>({
    mode: 'controlled',
    initialValues: INITIAL_FRIEND_FORM_VALUES,
    validate: schemaResolver(friendFormSchema, { sync: true }),
  });

  useEffect(() => {
    if (!opened) {
      form.reset();
      setSubmitError(null);
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened]);

  const handleSubmit = async (values: FriendFormValues) => {
    setSubmitError(null);
    setLoading(true);
    try {
      await createFriend(toCreateFriendPayload(values));
      notifySuccess('Amigo guardado');
      form.reset();
    } catch (err) {
      setSubmitError(getErrorMessage(err, 'No se pudo guardar el amigo'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Amigos guardados" centered>
      <Stack gap="md">
        {error ? (
          <ErrorState message="No se pudieron cargar los amigos" />
        ) : isLoading ? (
          <LoadingState size="sm" py="md" />
        ) : friends.length === 0 ? (
          <EmptyState icon={<UsersThreeIcon />} title="Sin amigos guardados" />
        ) : (
          <Stack gap="xs">
            {friends.map(friend => (
              <FriendRow key={friend.id} friend={friend} onUpdate={updateFriend} onDelete={deleteFriend} />
            ))}
          </Stack>
        )}

        <Divider />

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

            <TextInput
              placeholder="Nombre"
              required
              maxLength={SPLIT_FRIEND_NAME_MAX}
              {...form.getInputProps('name')}
            />
            <TextInput
              placeholder="Alias"
              required
              maxLength={SPLIT_FRIEND_ALIAS_MAX}
              {...form.getInputProps('alias')}
            />

            <Group justify="flex-end">
              <Button type="submit" fullWidth loading={loading}>
                Guardar amigo
              </Button>
            </Group>
          </Stack>
        </form>
      </Stack>
    </Modal>
  );
};
