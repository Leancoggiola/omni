import { ROLE_LABELS } from '@omni/shared/auth';
import { FONT_SIZE, LINE_HEIGHT, SPACING } from '@omni/shared/theme';
import { TrashIcon } from 'phosphor-react-native';
import { memo } from 'react';
import { Paragraph, XStack, YStack } from 'tamagui';

import { Badge, IconButton, UserAvatar } from '@/shared/ui';

import { formatCreatedAt } from '../utils/formatCreatedAt';

import type { AdminUser } from '@omni/shared/users';

type UserRowProps = {
  user: AdminUser;
  deleting: boolean;
  onDeletePress: (user: AdminUser) => void;
};

/**
 * Fila de usuario (= `UserRow` de web, con la estructura del canvas mobile): avatar, nombre, badge de rol con
 * `@usuario · Alta dd/mm/aaaa` y tacho, que solo tienen los USER (un ADMIN deja el lugar vacío para alinear).
 */
export const UserRow = memo(function UserRow({ user, deleting, onDeletePress }: UserRowProps) {
  const created = formatCreatedAt(user.createdAt);

  return (
    <XStack alignItems="center" gap={SPACING.sm} paddingVertical={SPACING.xs}>
      <UserAvatar name={user.name} />
      <YStack flex={1} gap={SPACING['3xs']}>
        <Paragraph fontSize={FONT_SIZE.lg} lineHeight={LINE_HEIGHT.xl} fontWeight="600" numberOfLines={1}>
          {user.name}
        </Paragraph>
        <XStack gap={SPACING.xs} alignItems="center">
          <Badge color={user.role === 'ADMIN' ? 'accent' : 'dimmed'}>{ROLE_LABELS[user.role]}</Badge>
          <XStack flex={1} minWidth={0} accessible accessibilityLabel={`@${user.username}, alta ${created}`}>
            <Paragraph flexShrink={1} color="$dimmed" fontSize={FONT_SIZE.sm} numberOfLines={1}>
              {`@${user.username}`}
            </Paragraph>
            <Paragraph flexShrink={0} color="$dimmed" fontSize={FONT_SIZE.sm} numberOfLines={1}>
              {` · Alta ${created}`}
            </Paragraph>
          </XStack>
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
