import { FONT_SIZE, RADIUS, SPACING } from '@omni/shared/theme';
import { describeMyBalance } from '@omni/shared/split-expenses';
import { XStack, YStack } from 'tamagui';

import { Badge, Paragraph, SectionCard } from '@/shared/ui';

import { describeLastExpense, formatLastExpenseTime, gatheringCaption, toneForName } from '../utils/presentation';
import { ParticipantAvatar } from './ParticipantAvatar';

import type { BalanceTone, GatheringSummary } from '@omni/shared/split-expenses';

const BADGE_COLOR = {
  success: 'success',
  accent: 'accent',
  dimmed: 'dimmed',
} as const satisfies Record<BalanceTone, string>;

type GatheringCardProps = {
  gathering: GatheringSummary;
  onPress: (gathering: GatheringSummary) => void;
};

/**
 * Juntada de la lista. La activa muestra su resumen, tu saldo en ella y el último gasto como un mensaje del feed; la
 * saldada es compacta.
 */
export function GatheringCard({ gathering, onPress }: GatheringCardProps) {
  const caption = gatheringCaption(gathering);
  const balance = describeMyBalance(gathering.myBalance);
  const { lastExpense } = gathering;
  const preview = lastExpense ? describeLastExpense(lastExpense) : null;
  const label = gathering.isSettled
    ? [gathering.name, caption, 'Saldada']
    : [gathering.name, caption, balance.label, preview ? `Último gasto: ${preview}` : 'Sin gastos todavía'];

  return (
    <YStack
      opacity="press:0.7"
      onPress={() => onPress(gathering)}
      accessible
      accessibilityRole="button"
      accessibilityLabel={label.join(', ')}
    >
      <SectionCard>
        <YStack gap={SPACING.sm}>
          <XStack gap={SPACING.sm} alignItems={gathering.isSettled ? 'center' : 'flex-start'}>
            <YStack flex={1} gap={SPACING['3xs']}>
              <Paragraph fontSize={FONT_SIZE.lg} fontWeight="700" numberOfLines={1}>
                {gathering.name}
              </Paragraph>
              <Paragraph color="dimmed" fontSize={FONT_SIZE.sm}>
                {caption}
              </Paragraph>
            </YStack>
            {gathering.isSettled ? (
              <Badge color="success" size="md" alignSelf="center">
                Saldada
              </Badge>
            ) : null}
          </XStack>
          {gathering.isSettled ? null : (
            <Badge color={BADGE_COLOR[balance.tone]} size="md">
              {balance.label}
            </Badge>
          )}
          {!gathering.isSettled && lastExpense && preview ? (
            <XStack
              alignItems="center"
              gap={SPACING.xs}
              paddingVertical={SPACING.xs}
              paddingHorizontal={SPACING.sm}
              borderRadius={RADIUS.lg}
              borderBottomLeftRadius={RADIUS.xs}
              backgroundColor="background"
            >
              <ParticipantAvatar
                name={lastExpense.participantName}
                tone={lastExpense.isSelf ? undefined : toneForName(lastExpense.participantName)}
                size={24}
              />
              <Paragraph flex={1} fontSize={FONT_SIZE.md} numberOfLines={1}>
                {preview}
              </Paragraph>
              <Paragraph color="dimmed" fontSize={FONT_SIZE.sm}>
                {formatLastExpenseTime(lastExpense.createdAt)}
              </Paragraph>
            </XStack>
          ) : null}
        </YStack>
      </SectionCard>
    </YStack>
  );
}
