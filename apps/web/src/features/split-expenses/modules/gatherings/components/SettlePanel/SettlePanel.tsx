import { FC } from 'react';
import { Button, Divider, Group, Paper, Stack, Text, Title } from '@mantine/core';

import {
  type BalanceTone,
  describeSettlement,
  formatSignedBalance,
  participantLabel,
  participantTones,
} from '../../utils/gatheringView';
import { MoneyAmount } from '../MoneyAmount';
import { ParticipantAvatar } from '../ParticipantAvatar';

import type { GatheringDetail } from '@omni/shared/split-expenses';

import classes from './SettlePanel.module.scss';

import { ArrowCounterClockwiseIcon, CheckCircleIcon, CheckIcon } from '@phosphor-icons/react';

const TONE_COLORS: Record<BalanceTone, string> = {
  success: 'var(--mantine-color-text-success)',
  accent: 'var(--mantine-color-text-accent)',
  dimmed: 'var(--mantine-color-text-dimmed)',
};

interface SettlePanelProps {
  gathering: GatheringDetail;
  loading: boolean;
  onToggleSettled: () => void;
}

/**
 * Panel derecho "Saldar cuentas": quién le transfiere a quién, saldo de cada participante y la acción de marcar la
 * juntada como saldada (o reabrirla, si ya lo está).
 */
export const SettlePanel: FC<SettlePanelProps> = ({ gathering, loading, onToggleSettled }) => {
  const tones = participantTones(gathering.participants);
  const hasExpenses = gathering.expenses.length > 0;

  return (
    <Paper component="section" className={classes.root} aria-label="Saldar cuentas">
      <Title order={3} size="h4">
        Saldar cuentas
      </Title>

      {gathering.settlements.length > 0 ? (
        <Stack gap="xs" role="group" aria-label="¿Quién le debe a quién?">
          {gathering.settlements.map(settlement => {
            const { from, to } = describeSettlement(settlement, gathering.participants);
            return (
              <div key={`${settlement.fromParticipantId}-${settlement.toParticipantId}`} className={classes.transfer}>
                <Text size="xs" fw={600}>
                  {from} → {to}
                </Text>
                <Text fw={800} fz="lg">
                  <MoneyAmount value={settlement.amount} />
                </Text>
              </div>
            );
          })}
        </Stack>
      ) : (
        <Text size="sm" c="dimmed">
          {hasExpenses ? 'Nadie le debe nada a nadie.' : 'Cuando cargues gastos vas a ver quién le debe a quién.'}
        </Text>
      )}

      <Divider />

      <Stack gap="xs" role="group" aria-label="Saldo de cada participante">
        {gathering.participants.map(participant => {
          const { label, tone } = formatSignedBalance(participant.balance);
          return (
            <Group key={participant.id} gap="xs" wrap="nowrap">
              <ParticipantAvatar name={participant.displayName} tone={tones[participant.id]} size="1.5rem" />
              <Text size="sm" style={{ flex: 1 }} lineClamp={1}>
                {participantLabel(participant)}
              </Text>
              <Text size="sm" fw={700} c={TONE_COLORS[tone]}>
                {label}
              </Text>
            </Group>
          );
        })}
      </Stack>

      {gathering.isSettled ? (
        <div className={classes.done}>
          <span className={classes.doneIcon}>
            <CheckIcon size="1.75rem" />
          </span>
          <Title order={4}>Todo saldado</Title>
          <Text size="sm" c="dimmed">
            {gathering.settlements.length === 0 ? 'No queda nada pendiente.' : 'La juntada se marcó como saldada.'}
          </Text>
          <Button
            variant="outline"
            fullWidth
            leftSection={<ArrowCounterClockwiseIcon size="1.1rem" />}
            loading={loading}
            onClick={onToggleSettled}
          >
            Reabrir
          </Button>
        </div>
      ) : (
        <Button
          color="success"
          fullWidth
          leftSection={<CheckCircleIcon size="1.1rem" />}
          loading={loading}
          onClick={onToggleSettled}
        >
          Marcar como saldada
        </Button>
      )}
    </Paper>
  );
};
