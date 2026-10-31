import { Avatar, Group, Text } from '@mantine/core';

import { UserAvatar } from './UserAvatar';

import type { ItemAuthor } from '@omni/shared/household';
import type { FC } from 'react';

interface AuthorTagProps {
  author: ItemAuthor;
  /** Con `false` queda solo el avatar (el nombre sigue como `aria-label`). */
  showName?: boolean;
}

/**
 * Quién agregó un ítem compartido: avatar chico y, opcionalmente, el nombre ("Vos" si es la propia sesión). La
 * cuenta eliminada es un avatar neutro con "?". Mismo contrato que `AuthorTag` de mobile.
 */
export const AuthorTag: FC<AuthorTagProps> = ({ author, showName = true }) => {
  const label = author.kind === 'self' ? 'Vos' : author.name;

  return (
    <Group gap="xs" wrap="nowrap" aria-label={`Agregado por ${label}`}>
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
          {label}
        </Text>
      )}
    </Group>
  );
};
