import { Avatar, Group, Text } from '@mantine/core';

import { UserAvatar } from './UserAvatar';

import type { ItemAuthor } from '@omni/shared/household';
import type { FC } from 'react';

import { ITEM_ADDED_BY_LABEL } from '@omni/shared/household';

interface AuthorTagProps {
  author: ItemAuthor;
  showName?: boolean;
  actionLabel?: string;
  showActionLabel?: boolean;
}

/**
 * Quién agregó un ítem compartido: avatar chico y, opcionalmente, el nombre ("Vos" si es la propia sesión). La
 * cuenta eliminada es un avatar neutro con "?". Mismo contrato que `AuthorTag` de mobile.
 * Con `showName={false}` queda solo el avatar (el nombre sigue como `aria-label`). `actionLabel` nombra la acción
 * ("Agregado por", "Editado por") en el `aria-label`; con `showActionLabel` también se ve delante del nombre.
 */
export const AuthorTag: FC<AuthorTagProps> = ({
  author,
  showName = true,
  actionLabel = ITEM_ADDED_BY_LABEL,
  showActionLabel = false,
}) => {
  const label = author.kind === 'self' ? 'Vos' : author.name;

  return (
    <Group gap="xs" wrap="nowrap" role="group" aria-label={`${actionLabel} ${label}`}>
      {author.kind === 'deleted' ? (
        <Avatar size="1.5rem" radius="xl" variant="default">
          ?
        </Avatar>
      ) : (
        <UserAvatar
          name={author.name}
          src={author.avatarUrl}
          size="1.5rem"
          color={author.kind === 'member' ? 'terracotta' : undefined}
        />
      )}
      {showName && (
        <Text size="xs" c="dimmed" lineClamp={1}>
          {showActionLabel ? `${actionLabel} ${label}` : label}
        </Text>
      )}
    </Group>
  );
};
