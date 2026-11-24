import { FC } from 'react';
import { ActionIcon, Avatar, Group, Text } from '@mantine/core';

import {
  describeExpenseSharers,
  expenseSharers,
  formatExpenseTime,
  participantLabel,
  participantTones,
} from '../../utils/gatheringView';
import { MoneyAmount } from '../MoneyAmount';
import { ParticipantAvatar } from '../ParticipantAvatar';

import type { ParticipantTone } from '../../utils/gatheringView';
import type { GatheringExpense, GatheringParticipantSummary } from '@omni/shared/split-expenses';

import classes from './GatheringFeed.module.scss';

import { XIcon } from '@phosphor-icons/react';

interface FeedBubbleProps {
  expense: GatheringExpense;
  payer: GatheringParticipantSummary | undefined;
  participants: GatheringParticipantSummary[];
  tone: ParticipantTone | undefined;
  canDelete: boolean;
  onDelete: (expense: GatheringExpense) => void;
}

/**
 * Un gasto como burbuja de chat: avatar de quien pagó, nombre y hora, detalle e importe. Si se divide entre algunos
 * y no entre todos, suma la línea "Entre …" con mini avatares.
 */
export const FeedBubble: FC<FeedBubbleProps> = ({ expense, payer, participants, tone, canDelete, onDelete }) => {
  const who = payer ? participantLabel(payer) : expense.participantName;
  const sharers = expenseSharers(expense, participants);
  const sharersLabel = describeExpenseSharers(expense, participants);
  const tones = participantTones(participants);

  return (
    <div className={classes.item}>
      <ParticipantAvatar name={expense.participantName} tone={tone} />
      <div className={classes.bubble}>
        <Group justify="space-between" wrap="nowrap" gap="xs">
          <Group gap="xs" wrap="nowrap">
            <Text size="xs" fw={700}>
              {who}
            </Text>
            <Text size="xs" c="dimmed">
              {formatExpenseTime(expense.createdAt)}
            </Text>
          </Group>
          {canDelete && (
            <ActionIcon
              variant="subtle"
              color="gray"
              size="sm"
              aria-label={`Eliminar gasto de ${who}`}
              onClick={() => onDelete(expense)}
            >
              <XIcon size="0.875rem" />
            </ActionIcon>
          )}
        </Group>
        <Group justify="space-between" wrap="nowrap" gap="md" align="baseline">
          <Text size="sm" c={expense.description ? undefined : 'dimmed'}>
            {expense.description ?? 'Gasto sin detalle'}
          </Text>
          <Text fw={800} fz="lg">
            <MoneyAmount value={expense.amount} />
          </Text>
        </Group>
        {sharersLabel && (
          <Group gap="xs" wrap="nowrap" mt={4}>
            <Avatar.Group aria-hidden="true">
              {sharers.map(sharer => (
                <ParticipantAvatar key={sharer.id} name={sharer.displayName} tone={tones[sharer.id]} size="1.25rem" />
              ))}
            </Avatar.Group>
            <Text size="xs" c="dimmed">
              {sharersLabel}
            </Text>
          </Group>
        )}
      </div>
    </div>
  );
};
