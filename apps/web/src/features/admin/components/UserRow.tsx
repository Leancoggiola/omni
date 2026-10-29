import { FC, useState } from 'react';
import { ActionIcon, Badge, Group, Paper, Stack, Text } from '@mantine/core';

import { extractIsoDateKey, formatIsoDateStringForDisplay } from '@/shared/dates';
import { confirm, getErrorMessage, notifyError, notifySuccess, UserAvatar } from '@/shared/ui';

import type { AdminUser } from '@omni/shared/users';

import { ROLE_LABELS } from '@omni/shared/auth';
import { TrashIcon } from '@phosphor-icons/react';

interface UserRowProps {
  user: AdminUser;
  onDelete: (userId: string) => Promise<void>;
}

function formatCreatedAt(createdAt: string): string {
  const isoDate = extractIsoDateKey(createdAt);
  return isoDate ? formatIsoDateStringForDisplay(isoDate) : '';
}

export const UserRow: FC<UserRowProps> = ({ user, onDelete }) => {
  const [deleting, setDeleting] = useState(false);

  const canDelete = user.role === 'USER';

  const handleDelete = async () => {
    if (deleting) return;

    const confirmed = await confirm({
      title: 'Eliminar usuario',
      description: `¿Seguro que querés eliminar a "${user.name}" (@${user.username})? Se borrarán también todos sus datos (medios, gimnasio, alacena, gastos y más). Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar usuario',
      cancelLabel: 'Cancelar',
    });
    if (!confirmed) return;

    setDeleting(true);
    try {
      await onDelete(user.id);
      notifySuccess('Usuario eliminado');
    } catch (err) {
      notifyError(getErrorMessage(err, 'No se pudo eliminar el usuario'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Paper component="li" withBorder p="md" radius="md">
      <Group justify="space-between" align="center" gap="md">
        <Group gap="md" wrap="nowrap" miw={0}>
          <UserAvatar name={user.name} src={user.avatarUrl} />
          <Stack gap="3xs" miw={0}>
            <Text fw={600} truncate>
              {user.name}
            </Text>
            <Text size="sm" c="dimmed" truncate>
              @{user.username}
              {user.email ? ` · ${user.email}` : ''}
            </Text>
          </Stack>
        </Group>

        <Group gap="md" wrap="nowrap">
          <Badge variant="light" color={user.role === 'ADMIN' ? 'terracotta' : 'brand'}>
            {ROLE_LABELS[user.role]}
          </Badge>
          <Text size="sm" c="dimmed">
            Alta {formatCreatedAt(user.createdAt)}
          </Text>
          {canDelete && (
            <ActionIcon
              variant="subtle"
              color="destructive"
              aria-label={`Eliminar ${user.username}`}
              loading={deleting}
              onClick={handleDelete}
            >
              <TrashIcon size="1rem" />
            </ActionIcon>
          )}
        </Group>
      </Group>
    </Paper>
  );
};
