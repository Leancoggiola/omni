import { FC } from 'react';
import { ActionIcon, Alert, Avatar, Menu, Paper, Text, Title } from '@mantine/core';

import { useDisplayStyles } from '@/shared/ui';

import { formatGatheringWeekday, groupExpensesByDay, participantTones } from '../../utils/gatheringView';
import { MoneyAmount } from '../MoneyAmount';
import { Overline } from '../Overline';
import { ParticipantAvatar } from '../ParticipantAvatar';
import { ExpenseComposer } from './ExpenseComposer';
import { FeedBubble } from './FeedBubble';

import type { AddGatheringExpensePayload, GatheringDetail, GatheringExpense } from '@omni/shared/split-expenses';

import classes from './GatheringFeed.module.scss';

import { DotsThreeIcon, TrashIcon, WarningCircleIcon } from '@phosphor-icons/react';

interface GatheringFeedProps {
  gathering: GatheringDetail;
  deleting: boolean;
  onAddExpense: (payload: AddGatheringExpensePayload) => Promise<void>;
  onDeleteExpense: (expense: GatheringExpense) => void;
  onDeleteGathering: () => void;
}

/**
 * Panel central: cabecera de la juntada (resumen, avatares y opciones), feed de gastos en burbujas agrupadas por día
 * y composer. Saldada, el composer no se muestra; con una sola persona no hay entre quién dividir y avisa.
 */
export const GatheringFeed: FC<GatheringFeedProps> = ({
  gathering,
  deleting,
  onAddExpense,
  onDeleteExpense,
  onDeleteGathering,
}) => {
  const titleStyles = useDisplayStyles('md');
  const tones = participantTones(gathering.participants);
  const days = groupExpensesByDay(gathering.expenses);
  const canSplit = gathering.participants.length >= 2;

  return (
    <Paper component="section" className={classes.root} aria-label="Feed de la juntada">
      <div className={classes.header}>
        <div className={classes.titles}>
          <Title order={2} {...titleStyles} lineClamp={1}>
            {gathering.name}
          </Title>
          <Text size="xs" c="dimmed">
            {formatGatheringWeekday(gathering.date)} · {gathering.participantCount} personas ·{' '}
            <MoneyAmount value={gathering.totalAmount} /> · <MoneyAmount value={gathering.fairShare} /> c/u
          </Text>
        </div>
        <Avatar.Group>
          {gathering.participants.map(participant => (
            <ParticipantAvatar
              key={participant.id}
              name={participant.displayName}
              tone={tones[participant.id]}
              size="2rem"
            />
          ))}
        </Avatar.Group>
        <Menu position="bottom-end" withinPortal>
          <Menu.Target>
            <ActionIcon variant="subtle" color="gray" aria-label="Opciones de la juntada">
              <DotsThreeIcon size="1.25rem" weight="bold" />
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item
              color="destructive"
              disabled={deleting}
              leftSection={<TrashIcon size="1rem" />}
              onClick={onDeleteGathering}
            >
              Eliminar juntada
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </div>

      {!canSplit && (
        <Alert color="warning" icon={<WarningCircleIcon size="1.25rem" />} title="Falta gente para dividir">
          Esta juntada tiene una sola persona: no hay entre quién repartir los gastos.
        </Alert>
      )}

      <div className={classes.feed}>
        {days.length === 0 && (
          <Text size="sm" c="dimmed">
            {gathering.isSettled || !canSplit
              ? 'Esta juntada no tiene gastos.'
              : 'Todavía no hay gastos: cargá el primero.'}
          </Text>
        )}
        {days.map(day => (
          <div key={day.key} className={classes.feed}>
            <Overline>{day.label}</Overline>
            {day.expenses.map(expense => (
              <FeedBubble
                key={expense.id}
                expense={expense}
                payer={gathering.participants.find(participant => participant.id === expense.participantId)}
                tone={tones[expense.participantId]}
                canDelete={!gathering.isSettled}
                onDelete={onDeleteExpense}
              />
            ))}
          </div>
        ))}
      </div>

      {!gathering.isSettled && canSplit && (
        <ExpenseComposer
          key={gathering.participants.map(participant => participant.id).join('|')}
          participants={gathering.participants}
          onAdd={onAddExpense}
        />
      )}
    </Paper>
  );
};
