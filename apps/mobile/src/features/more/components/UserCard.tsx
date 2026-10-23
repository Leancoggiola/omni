import { FONT_SIZE, RADIUS, SPACING } from '@omni/shared/theme';
import { useRouter } from 'expo-router';
import { CaretRightIcon } from 'phosphor-react-native';
import { Paragraph, XStack, YStack } from 'tamagui';

import { useAuth } from '@/core/auth';
import { useSemanticColors } from '@/core/theme';
import { UserAvatar } from '@/shared/ui';
import { elevation } from '@/theme/elevation';

/** Tarjeta de usuario del launcher (= tarjeta del pie del navbar de web): lleva a Perfil. */
export function UserCard() {
  const { user } = useAuth();
  const router = useRouter();
  const colors = useSemanticColors();

  return (
    <XStack
      alignItems="center"
      gap={SPACING.md}
      padding={SPACING.lg}
      borderRadius={RADIUS.lg}
      backgroundColor="$backgroundStrong"
      {...elevation('sm')}
      onPress={() => router.navigate('/profile')}
      pressStyle={{ opacity: 0.8 }}
      accessibilityRole="button"
      accessibilityLabel={`${user?.name ?? 'Tu cuenta'}. Ver perfil`}
    >
      <UserAvatar name={user?.name ?? ''} size={48} />
      <YStack flex={1} gap={SPACING['3xs']}>
        <Paragraph fontSize={FONT_SIZE.lg} fontWeight="600" numberOfLines={1}>
          {user?.name ?? '—'}
        </Paragraph>
        <Paragraph fontSize={FONT_SIZE.sm} color="$dimmed" numberOfLines={1}>
          {user ? (user.email ?? `@${user.username}`) : '—'}
        </Paragraph>
      </YStack>
      <CaretRightIcon size={18} color={colors.dimmed} />
    </XStack>
  );
}
