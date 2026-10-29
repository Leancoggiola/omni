import { FC, useState } from 'react';
import { ActionIcon, Badge, Box, Group, Stack, Text } from '@mantine/core';

import { extractIsoDateKey, formatIsoDateStringForDisplay } from '@/shared/dates';
import { confirm, getErrorMessage, notifyError, notifySuccess, UserAvatar } from '@/shared/ui';

import type { AdminUser } from '@omni/shared/users';

import classes from './UserRow.module.scss';

import { ROLE_LABELS } from '@omni/shared/auth';
import { TrashIcon } from '@phosphor-icons/react';

interface UserRowProps {
  user: AdminUser;
  onDelete: (userId: string) => Promise<void>;
}

const ROW_ACTION_SIZE = '2.5rem';
const AVATAR_TONES = ['terracotta', 'sage', 'brand'] as const;

/** Tono estable por usuario, derivado del id; el admin conserva el avatar de marca. */
function avatarTone(user: AdminUser): (typeof AVATAR_TONES)[number] | undefined {
  if (user.role === 'ADMIN') return undefined;
  const hash = [...user.id].reduce((total, char) => total + char.charCodeAt(0), 0);
  return AVATAR_TONES[hash % AVATAR_TONES.length];
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
    <Box component="li" className={classes.row} py="md">
      <Group justify="space-between" align="center" gap="md">
        <Group gap="md" wrap="nowrap" miw={0}>
          <UserAvatar name={user.name} src={user.avatarUrl} color={avatarTone(user)} />
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
          {canDelete ? (
            <ActionIcon
              variant="subtle"
              color="destructive"
              radius="full"
              size={ROW_ACTION_SIZE}
              aria-label={`Eliminar ${user.username}`}
              loading={deleting}
              onClick={handleDelete}
            >
              <TrashIcon size="1.25rem" />
            </ActionIcon>
          ) : (
            <Box w={ROW_ACTION_SIZE} aria-hidden />
          )}
        </Group>
      </Group>
    </Box>
  );
};
