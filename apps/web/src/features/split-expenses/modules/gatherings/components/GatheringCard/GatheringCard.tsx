import { FC, useState } from 'react';
import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Collapse,
  Divider,
  Group,
  Loader,
  Menu,
  Paper,
  Stack,
  Text,
  ThemeIcon,
} from '@mantine/core';

import { confirm, getErrorMessage, notifyError, notifySuccess } from '@/shared/ui';

import { useSplitExpensesMutations } from '../../../_shared';
import { useGathering } from '../../hooks';
import { AddExpenseForm } from '../AddExpenseForm';
import { MoneyAmount } from '../MoneyAmount';

import type { GatheringSummary } from '@omni/shared/split-expenses';

import {
  ArrowRightIcon,
  CaretDownIcon,
  CaretUpIcon,
  CheckCircleIcon,
  DotsThreeVerticalIcon,
  TrashIcon,
  UsersThreeIcon,
  XIcon,
} from '@phosphor-icons/react';

interface GatheringCardProps {
  summary: GatheringSummary;
}

const SectionLabel: FC<{ children: string }> = ({ children }) => (
  <Text size="xs" fw={700} c="dimmed" tt="uppercase">
    {children}
  </Text>
);

export const GatheringCard: FC<GatheringCardProps> = ({ summary }) => {
  const [expanded, setExpanded] = useState(!summary.isSettled);
  const [settleLoading, setSettleLoading] = useState(false);

  const { gathering, isLoading } = useGathering(expanded ? summary.id : null);
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
    const confirmed = await confirm({
      title: 'Eliminar juntada',
      description: `¿Seguro que querés eliminar "${summary.name}"? Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar',
      cancelLabel: 'Cancelar',
    });
    if (!confirmed) return;

    try {
      await deleteGathering(summary.id);
      notifySuccess('Juntada eliminada');
    } catch (err) {
      notifyError(getErrorMessage(err, 'No se pudo eliminar la juntada'));
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
              <Menu.Item color="red" leftSection={<TrashIcon size="1rem" />} onClick={handleDelete}>
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
        {isLoading && !gathering ? (
          <Group justify="center" py="xl">
            <Loader size="sm" />
          </Group>
        ) : gathering ? (
          <Stack gap="md" mt="md">
            <Divider />

            <Stack gap="xs">
              <SectionLabel>Participantes</SectionLabel>
              <Group gap="xs">
                {gathering.participants.map(participant => (
                  <Badge key={participant.id} variant="light" color="brand" size="lg" radius="sm">
                    <Text span fw={600} size="sm">
                      {participant.displayName}
                    </Text>{' '}
                    <Text span c="dimmed" size="sm">
                      <MoneyAmount value={participant.totalPaid} />
                    </Text>
                  </Badge>
                ))}
              </Group>
              <Text size="sm" c="dimmed">
                Parte equitativa: <MoneyAmount value={gathering.fairShare} /> c/u
              </Text>
            </Stack>

            {!isSettled && (
              <Stack gap="xs">
                <SectionLabel>Agregar gasto</SectionLabel>
                <AddExpenseForm participants={gathering.participants} onAdd={handleAddExpense} />
              </Stack>
            )}

            {gathering.expenses.length > 0 && (
              <Stack gap="xs">
                <SectionLabel>Gastos registrados</SectionLabel>
                <Stack gap="3xs">
                  {gathering.expenses.map(expense => (
                    <Paper key={expense.id} p="sm" radius="sm" bg="var(--mantine-color-body)">
                      <Group justify="space-between" wrap="nowrap">
                        <Group gap="xs" wrap="nowrap">
                          <Text size="sm" fw={600}>
                            {expense.participantName}
                          </Text>
                          <Text size="sm" fw={700}>
                            <MoneyAmount value={expense.amount} />
                          </Text>
                          {expense.description && (
                            <Text size="sm" c="dimmed">
                              — {expense.description}
                            </Text>
                          )}
                        </Group>
                        {!isSettled && (
                          <ActionIcon
                            variant="subtle"
                            color="gray"
                            aria-label="Eliminar gasto"
                            onClick={() => handleDeleteExpense(expense.id)}
                          >
                            <XIcon size="1rem" />
                          </ActionIcon>
                        )}
                      </Group>
                    </Paper>
                  ))}
                </Stack>
              </Stack>
            )}

            {gathering.settlements.length > 0 && (
              <Stack gap="xs">
                <SectionLabel>¿Quién le debe a quién?</SectionLabel>
                <Stack gap="3xs">
                  {gathering.settlements.map(settlement => (
                    <Paper
                      key={`${settlement.fromParticipantId}-${settlement.toParticipantId}`}
                      p="sm"
                      radius="sm"
                      bg="var(--mantine-color-brand-light)"
                    >
                      <Group justify="space-between" wrap="nowrap">
                        <Group gap="xs" align="center" wrap="nowrap">
                          <Text size="sm" fw={600}>
                            {settlement.fromName}
                          </Text>
                          <ArrowRightIcon size="1rem" />
                          <Text size="sm" fw={600}>
                            {settlement.toName}
                          </Text>
                        </Group>
                        <Text size="sm" fw={700}>
                          <MoneyAmount value={settlement.amount} />
                        </Text>
                      </Group>
                    </Paper>
                  ))}
                </Stack>
              </Stack>
            )}

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
