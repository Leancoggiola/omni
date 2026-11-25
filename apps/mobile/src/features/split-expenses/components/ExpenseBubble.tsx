import { formatMoney } from '@omni/shared/common';
import {
  describeExpenseSharers,
  describeSharerNames,
  expenseSharers,
  formatExpenseTime,
  participantLabel,
} from '@omni/shared/split-expenses';
import { FONT_SIZE, RADIUS, SPACING } from '@omni/shared/theme';
import { XStack, YStack } from 'tamagui';

import { useColorSchemeControl } from '@/core/theme';
import { Paragraph } from '@/shared/ui';
import { glassElevation } from '@/theme/elevation';

import { expenseTitle } from '../utils/presentation';
import { AvatarStack, ParticipantAvatar } from './ParticipantAvatar';

import type { GatheringExpense, GatheringParticipantSummary, ParticipantTone } from '@omni/shared/split-expenses';

type ExpenseBubbleProps = {
  expense: GatheringExpense;
  participants: GatheringParticipantSummary[];
  tones: Record<string, ParticipantTone | undefined>;
  compact?: boolean;
  onPress?: (expense: GatheringExpense) => void;
};

/**
 * Un gasto como mensaje del feed: avatar de quien pagó, nombre y hora, detalle e importe. Si se divide entre algunos
 * y no entre todos suma "Entre …" con mini avatares y la parte de cada uno. `compact` es la de una juntada saldada: una
 * línea, sin hora ni parte. Con `onPress` se toca para ver sus opciones.
 */
export function ExpenseBubble({ expense, participants, tones, compact = false, onPress }: ExpenseBubbleProps) {
  const { colorScheme } = useColorSchemeControl();
  const payer = participants.find(participant => participant.id === expense.participantId);
  const who = payer ? participantLabel(payer) : expense.participantName;
  const title = expenseTitle(expense);
  const amount = formatMoney(expense.amount);
  const sharersLine = compact
    ? describeSharerNames(expense, participants)
    : describeExpenseSharers(expense, participants);
  const label = [who, title, amount, formatExpenseTime(expense.createdAt), sharersLine].filter(Boolean).join(', ');

  return (
    <XStack alignItems="flex-end" gap={SPACING.xs}>
      <ParticipantAvatar
        name={payer?.displayName ?? expense.participantName}
        tone={tones[expense.participantId]}
        size={compact ? 24 : 32}
      />
      <YStack
        flex={1}
        gap={SPACING['2xs']}
        paddingVertical={compact ? SPACING.xs : SPACING.sm}
        paddingHorizontal={SPACING.md}
        borderRadius={RADIUS.xl}
        borderBottomLeftRadius={RADIUS.xs}
        borderWidth={1}
        borderColor="glassBorder"
        backgroundColor="surfaceGlass"
        {...glassElevation('card', colorScheme)}
        opacity={onPress ? 'press:0.7' : undefined}
        onPress={onPress ? () => onPress(expense) : undefined}
        accessible
        accessibilityRole={onPress ? 'button' : undefined}
        accessibilityLabel={label}
        accessibilityHint={onPress ? 'Abre las opciones del gasto' : undefined}
      >
        {compact ? null : (
          <XStack justifyContent="space-between" alignItems="center" gap={SPACING.xs}>
            <Paragraph color="primary" fontSize={FONT_SIZE.sm} fontWeight="700" flexShrink={1} numberOfLines={1}>
              {who}
            </Paragraph>
            <Paragraph color="dimmed" fontSize={FONT_SIZE.sm}>
              {formatExpenseTime(expense.createdAt)}
            </Paragraph>
          </XStack>
        )}
        <XStack justifyContent="space-between" alignItems="center" gap={SPACING.md}>
          <Paragraph flex={1} fontSize={compact ? FONT_SIZE.md : FONT_SIZE.lg}>
            {compact ? (
              <Paragraph color="primary" fontSize={FONT_SIZE.md} fontWeight="700">
                {who}
              </Paragraph>
            ) : null}
            {compact ? ` · ${title}` : title}
          </Paragraph>
          <Paragraph fontSize={compact ? FONT_SIZE.md : FONT_SIZE.xl} fontWeight="700">
            {amount}
          </Paragraph>
        </XStack>
        {sharersLine ? (
          <XStack alignItems="center" gap={SPACING.xs}>
            {compact ? null : (
              <AvatarStack
                people={expenseSharers(expense, participants).map(person => ({
                  id: person.id,
                  name: person.displayName,
                  tone: tones[person.id],
                }))}
                size={20}
              />
            )}
            <Paragraph flex={1} color="dimmed" fontSize={FONT_SIZE.sm}>
              {sharersLine}
            </Paragraph>
          </XStack>
        ) : null}
      </YStack>
    </XStack>
  );
}
