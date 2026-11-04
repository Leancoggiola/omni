import { ROLE_LABELS } from '@omni/shared/auth';
import { FONT_SIZE, LINE_HEIGHT, RADIUS, SPACING } from '@omni/shared/theme';
import { TrashIcon } from 'phosphor-react-native';
import { memo } from 'react';
import { Paragraph, XStack, YStack } from 'tamagui';

import { useColorSchemeControl } from '@/core/theme';
import { Badge, IconButton, UserAvatar } from '@/shared/ui';
import { glassElevation } from '@/theme/elevation';

import { formatCreatedAt } from '../utils/formatCreatedAt';

import type { AdminUser } from '@omni/shared/users';

type UserRowProps = {
  user: AdminUser;
  deleting: boolean;
  onDeletePress: (user: AdminUser) => void;
};

/**
 * Fila de usuario (= `UserRow` de web) en una card glass: avatar, nombre, `@usuario · email`, badge de rol, fecha de
 * alta y tacho, que solo tienen los USER (un ADMIN no se elimina desde acá).
 */
export const UserRow = memo(function UserRow({ user, deleting, onDeletePress }: UserRowProps) {
  const { colorScheme } = useColorSchemeControl();

  return (
    <XStack
      backgroundColor="$surfaceGlass"
      borderWidth={1}
      borderColor="$glassBorder"
      borderRadius={RADIUS.xl}
      padding={SPACING.sm}
      gap={SPACING.sm}
      alignItems="center"
      {...glassElevation('card', colorScheme)}
    >
      <UserAvatar name={user.name} />
      <YStack flex={1} gap={SPACING['3xs']}>
        <Paragraph fontSize={FONT_SIZE.lg} lineHeight={LINE_HEIGHT.xl} fontWeight="600" numberOfLines={1}>
          {user.name}
        </Paragraph>
        <Paragraph color="$dimmed" fontSize={FONT_SIZE.sm} numberOfLines={1}>
          {user.email ? `@${user.username} · ${user.email}` : `@${user.username}`}
        </Paragraph>
        <XStack gap={SPACING.xs} alignItems="center">
          <Badge color={user.role === 'ADMIN' ? 'accent' : 'dimmed'}>{ROLE_LABELS[user.role]}</Badge>
          <Paragraph color="$dimmed" fontSize={FONT_SIZE.sm}>{`Alta ${formatCreatedAt(user.createdAt)}`}</Paragraph>
        </XStack>
      </YStack>
      {user.role === 'USER' ? (
        <IconButton
          icon={TrashIcon}
          variant="subtle"
          color="destructive"
          size="sm"
          disabled={deleting}
          accessibilityLabel={`Eliminar ${user.username}`}
          onPress={() => onDeletePress(user)}
        />
      ) : null}
    </XStack>
  );
});
