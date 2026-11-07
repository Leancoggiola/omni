import { FC, useState } from 'react';
import { Button, Chip, Group, NumberInput, Text, TextInput } from '@mantine/core';

import { getErrorMessage, notifyError } from '@/shared/ui';

import { participantLabel } from '../../utils/gatheringView';

import type { AddGatheringExpensePayload, GatheringParticipantSummary } from '@omni/shared/split-expenses';

import classes from './GatheringFeed.module.scss';

import { MONEY_FORMAT } from '@omni/shared/common';
import { GATHERING_EXPENSE_DESCRIPTION_MAX } from '@omni/shared/split-expenses';

interface ExpenseComposerProps {
  participants: GatheringParticipantSummary[];
  onAdd: (payload: AddGatheringExpensePayload) => Promise<void>;
}

/** Composer del feed: quién pagó (chips; "Vos" por defecto), monto, detalle y "Agregar". */
export const ExpenseComposer: FC<ExpenseComposerProps> = ({ participants, onAdd }) => {
  const [participantId, setParticipantId] = useState<string>(
    (participants.find(participant => participant.isSelf) ?? participants[0])?.id ?? ''
  );
  const [amount, setAmount] = useState<number | string>('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const numericAmount = typeof amount === 'number' ? amount : Number(amount);
  const canSubmit = participantId !== '' && Number.isFinite(numericAmount) && numericAmount > 0;

  const handleSubmit = async () => {
    if (!canSubmit || loading) return;

    setLoading(true);
    try {
      const trimmedDescription = description.trim();
      await onAdd({
        participantId,
        amount: numericAmount,
        description: trimmedDescription ? trimmedDescription : null,
      });
      setAmount('');
      setDescription('');
    } catch (err) {
      notifyError(getErrorMessage(err, 'No se pudo agregar el gasto'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      className={classes.composer}
      noValidate
      aria-label="Agregar gasto"
      onSubmit={event => {
        event.preventDefault();
        handleSubmit();
      }}
    >
      <Group gap="xs" role="radiogroup" aria-label="Quién pagó">
        <Text size="xs" fw={600} c="dimmed">
          Pagó
        </Text>
        <Chip.Group multiple={false} value={participantId} onChange={setParticipantId}>
          {participants.map(participant => (
            <Chip key={participant.id} value={participant.id} size="sm">
              {participantLabel(participant)}
            </Chip>
          ))}
        </Chip.Group>
      </Group>
      <Group gap="xs" align="flex-start">
        <NumberInput
          aria-label="Monto"
          placeholder="$ 0"
          value={amount}
          onChange={setAmount}
          min={0}
          step={1}
          hideControls
          fw={700}
          w="6.5rem"
          {...MONEY_FORMAT}
        />
        <TextInput
          aria-label="Descripción"
          placeholder="¿En qué se gastó?"
          value={description}
          maxLength={GATHERING_EXPENSE_DESCRIPTION_MAX}
          onChange={event => setDescription(event.currentTarget.value)}
          style={{ flex: '1 1 7rem' }}
        />
        <Button type="submit" aria-label="Agregar gasto" loading={loading} disabled={!canSubmit}>
          Agregar
        </Button>
      </Group>
    </form>
  );
};
