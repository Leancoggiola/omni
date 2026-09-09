import { FC, useState } from 'react';
import { ActionIcon, Group, NumberInput, Select, TextInput } from '@mantine/core';

import { getErrorMessage, notifyError } from '@/shared/ui';

import type { AddGatheringExpensePayload, GatheringParticipantSummary } from '@omni/shared/split-expenses';

import { GATHERING_EXPENSE_DESCRIPTION_MAX } from '@omni/shared/split-expenses';
import { PlusIcon } from '@phosphor-icons/react';

interface AddExpenseFormProps {
  participants: GatheringParticipantSummary[];
  onAdd: (payload: AddGatheringExpensePayload) => Promise<void>;
}

export const AddExpenseForm: FC<AddExpenseFormProps> = ({ participants, onAdd }) => {
  const [participantId, setParticipantId] = useState<string | null>(participants[0]?.id ?? null);
  const [amount, setAmount] = useState<number | string>('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const numericAmount = typeof amount === 'number' ? amount : Number(amount);
  const canSubmit = participantId != null && Number.isFinite(numericAmount) && numericAmount > 0;

  const handleSubmit = async () => {
    if (!canSubmit || loading || participantId == null) return;

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
    <Group gap="xs" align="flex-start" wrap="nowrap">
      <Select
        aria-label="Participante"
        data={participants.map(participant => ({ value: participant.id, label: participant.displayName }))}
        value={participantId}
        onChange={setParticipantId}
        allowDeselect={false}
        w="12rem"
      />
      <NumberInput
        aria-label="Monto"
        placeholder="0"
        value={amount}
        onChange={setAmount}
        min={0}
        step={1}
        hideControls
        prefix="$"
        thousandSeparator="."
        decimalSeparator=","
        decimalScale={2}
        w="8rem"
      />
      <TextInput
        aria-label="Descripción"
        placeholder="Descripción (opcional)"
        value={description}
        maxLength={GATHERING_EXPENSE_DESCRIPTION_MAX}
        onChange={event => setDescription(event.currentTarget.value)}
        onKeyDown={event => {
          if (event.key === 'Enter') handleSubmit();
        }}
        style={{ flex: 1 }}
      />
      <ActionIcon
        aria-label="Agregar gasto"
        variant="gradient"
        size="lg"
        loading={loading}
        disabled={!canSubmit}
        onClick={handleSubmit}
      >
        <PlusIcon size="1.1rem" weight="bold" />
      </ActionIcon>
    </Group>
  );
};
