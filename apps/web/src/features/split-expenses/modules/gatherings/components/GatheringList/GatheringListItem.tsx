import { FC } from 'react';
import { Badge, Group, Text, UnstyledButton } from '@mantine/core';

import { formatGatheringShortDate } from '../../utils/gatheringView';
import { BalanceBadge } from '../BalanceBadge';
import { MoneyAmount } from '../MoneyAmount';

import type { GatheringSummary } from '@omni/shared/split-expenses';

import classes from './GatheringList.module.scss';

interface GatheringListItemProps {
  gathering: GatheringSummary;
  selected: boolean;
  onSelect: (gatheringId: string) => void;
}

/** Fila de la lista de juntadas: la activa muestra fecha, resumen y saldo propio; la saldada es compacta. */
export const GatheringListItem: FC<GatheringListItemProps> = ({ gathering, selected, onSelect }) => {
  if (gathering.isSettled) {
    return (
      <UnstyledButton
        className={`${classes.item} ${classes.compact}`}
        data-selected={selected || undefined}
        aria-current={selected || undefined}
        onClick={() => onSelect(gathering.id)}
      >
        <Text fw={600} size="sm" style={{ flex: 1 }} lineClamp={1}>
          {gathering.name}
        </Text>
        <Badge variant="light" color="sage" size="md" tt="none">
          Saldada
        </Badge>
      </UnstyledButton>
    );
  }

  return (
    <UnstyledButton
      className={classes.item}
      data-selected={selected || undefined}
      aria-current={selected || undefined}
      onClick={() => onSelect(gathering.id)}
    >
      <Group justify="space-between" wrap="nowrap" gap="xs">
        <Text fw={700} lineClamp={1}>
          {gathering.name}
        </Text>
        <Text size="xs" c="dimmed">
          {formatGatheringShortDate(gathering.date)}
        </Text>
      </Group>
      <Text size="xs" c="dimmed" lineClamp={1}>
        {gathering.participantCount} personas · <MoneyAmount value={gathering.totalAmount} />
      </Text>
      <BalanceBadge balance={gathering.myBalance} />
    </UnstyledButton>
  );
};
