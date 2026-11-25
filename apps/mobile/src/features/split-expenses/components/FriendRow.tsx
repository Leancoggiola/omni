import { FONT_SIZE, SPACING } from '@omni/shared/theme';
import { PencilSimpleIcon } from 'phosphor-react-native';
import { XStack, YStack } from 'tamagui';

import { IconButton, Paragraph } from '@/shared/ui';

import { describeFriendBalance, toneForName } from '../utils/presentation';
import { ParticipantAvatar } from './ParticipantAvatar';

import type { SplitFriendWithBalance } from '@omni/shared/split-expenses';

type FriendRowProps = {
  friend: SplitFriendWithBalance;
  divided: boolean;
  onEdit: (friend: SplitFriendWithBalance) => void;
};

/** Amigo guardado con su saldo en las juntadas activas; el lápiz abre su edición. */
export function FriendRow({ friend, divided, onEdit }: FriendRowProps) {
  const balance = describeFriendBalance(friend.balance);

  return (
    <XStack
      alignItems="center"
      gap={SPACING.sm}
      paddingVertical={SPACING.sm}
      borderTopWidth={divided ? 1 : 0}
      borderColor="hairline"
    >
      <ParticipantAvatar name={friend.name} tone={toneForName(friend.name)} size={40} />
      <YStack flex={1} gap={SPACING['3xs']}>
        <Paragraph fontSize={FONT_SIZE.lg} fontWeight="600" numberOfLines={1}>
          {friend.name}
        </Paragraph>
        <Paragraph color={balance.tone} fontSize={FONT_SIZE.sm}>
          {balance.label}
        </Paragraph>
      </YStack>
      <IconButton
        icon={PencilSimpleIcon}
        accessibilityLabel={`Editar a ${friend.name}`}
        onPress={() => onEdit(friend)}
      />
    </XStack>
  );
}
