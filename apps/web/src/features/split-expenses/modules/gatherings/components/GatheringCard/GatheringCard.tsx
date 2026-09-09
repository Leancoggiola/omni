import { FC, useState } from 'react';
import { ActionIcon, Badge, Button, Card, Collapse, Divider, Group, Menu, Stack, Text, ThemeIcon } from '@mantine/core';

import { confirm, ErrorState, getErrorMessage, LoadingState, notifyError, notifySuccess } from '@/shared/ui';

import { useSplitExpensesMutations } from '../../../_shared';
import { useGathering } from '../../hooks';
import { AddExpenseForm } from '../AddExpenseForm';
import { MoneyAmount } from '../MoneyAmount';
import { GatheringExpenses } from './GatheringExpenses';
import { GatheringParticipants } from './GatheringParticipants';
import { GatheringSection } from './GatheringSection';
import { GatheringSettlements } from './GatheringSettlements';

import type { GatheringSummary } from '@omni/shared/split-expenses';

import {
  CaretDownIcon,
  CaretUpIcon,
  CheckCircleIcon,
  DotsThreeVerticalIcon,
  TrashIcon,
  UsersThreeIcon,
} from '@phosphor-icons/react';

interface GatheringCardProps {
  summary: GatheringSummary;
}

export const GatheringCard: FC<GatheringCardProps> = ({ summary }) => {
  const [expanded, setExpanded] = useState(!summary.isSettled);
  const [settleLoading, setSettleLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { gathering, isLoading, error } = useGathering(expanded ? summary.id : null);
  const { addGatheringExpense, deleteGatheringExpense, toggleGatheringSettled, deleteGathering } =
    useSplitExpensesMutations();

  const isSettled = gathering?.isSettled ?? summary.isSettled;

  const handleAddExpense = async (payload: Parameters<typeof addGatheringExpense>[1]) => {
    await addGatheringExpense(summary.id, payload);
  };

  const handleDeleteExpense = async (expenseId: string) => {
    try {
      await deleteGatheringExpense(summary.id, expenseId);
    } catch (err) {
      notifyError(getErrorMessage(err, 'No se pudo eliminar el gasto'));
    }
  };

  const handleToggleSettled = async () => {
    setSettleLoading(true);
    try {
      await toggleGatheringSettled(summary.id, { isSettled: !isSettled });
      notifySuccess(isSettled ? 'Juntada marcada como pendiente' : 'Juntada saldada');
    } catch (err) {
      notifyError(getErrorMessage(err, 'No se pudo actualizar la juntada'));
    } finally {
      setSettleLoading(false);
    }
  };

  const handleDelete = async () => {
    if (deleting) return;

    const confirmed = await confirm({
      title: 'Eliminar juntada',
      description: `¿Seguro que querés eliminar "${summary.name}"? Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar',
      cancelLabel: 'Cancelar',
    });
    if (!confirmed) return;

    setDeleting(true);
    try {
      await deleteGathering(summary.id);
      notifySuccess('Juntada eliminada');
    } catch (err) {
      notifyError(getErrorMessage(err, 'No se pudo eliminar la juntada'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Card padding="lg" radius="md">
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <Group gap="sm" align="center" wrap="nowrap">
          <ThemeIcon variant="light" size="xl" radius="md" color="brand">
            <UsersThreeIcon size="1.4rem" />
          </ThemeIcon>
          <Stack gap="3xs">
            <Group gap="xs" align="center">
              <Text fw={600}>{summary.name}</Text>
              {summary.isSettled && (
                <Badge color="green" variant="light" size="sm">
                  Saldado
                </Badge>
              )}
            </Group>
            <Text size="sm" c="dimmed">
              {summary.date} · {summary.participantCount} participantes · Total:{' '}
              <MoneyAmount value={summary.totalAmount} />
            </Text>
          </Stack>
        </Group>
        <Group gap="3xs" wrap="nowrap">
          <Menu position="bottom-end" withinPortal>
            <Menu.Target>
              <ActionIcon variant="subtle" color="gray" aria-label="Opciones de la juntada">
                <DotsThreeVerticalIcon size="1.2rem" weight="bold" />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item color="red" disabled={deleting} leftSection={<TrashIcon size="1rem" />} onClick={handleDelete}>
                Eliminar juntada
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
          <ActionIcon
            variant="subtle"
            color="gray"
            aria-label={expanded ? 'Contraer' : 'Expandir'}
            onClick={() => setExpanded(value => !value)}
          >
            {expanded ? <CaretUpIcon size="1.1rem" /> : <CaretDownIcon size="1.1rem" />}
          </ActionIcon>
        </Group>
      </Group>

      <Collapse expanded={expanded}>
        {error ? (
          <Stack mt="md">
            <ErrorState message="No se pudo cargar la juntada" />
          </Stack>
        ) : isLoading && !gathering ? (
          <LoadingState size="sm" />
        ) : gathering ? (
          <Stack gap="md" mt="md">
            <Divider />

            <GatheringParticipants participants={gathering.participants} fairShare={gathering.fairShare} />

            {!isSettled && (
              <GatheringSection label="Agregar gasto">
                <AddExpenseForm
                  key={gathering.participants.map(participant => participant.id).join('|')}
                  participants={gathering.participants}
                  onAdd={handleAddExpense}
                />
              </GatheringSection>
            )}

            {gathering.expenses.length > 0 && (
              <GatheringExpenses expenses={gathering.expenses} canDelete={!isSettled} onDelete={handleDeleteExpense} />
            )}

            {gathering.settlements.length > 0 && <GatheringSettlements settlements={gathering.settlements} />}

            <Button
              variant={isSettled ? 'default' : 'filled'}
              color="green"
              leftSection={<CheckCircleIcon size="1.1rem" />}
              loading={settleLoading}
              onClick={handleToggleSettled}
            >
              {isSettled ? 'Marcar como pendiente' : 'Marcar como saldado'}
            </Button>
          </Stack>
        ) : null}
      </Collapse>
    </Card>
  );
};
