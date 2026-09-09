import { FC } from 'react';
import { ActionIcon, Group, Paper, Stack, Text } from '@mantine/core';

import { MoneyAmount } from '../MoneyAmount';
import { GatheringSection } from './GatheringSection';

import type { GatheringExpense } from '@omni/shared/split-expenses';

import { XIcon } from '@phosphor-icons/react';

interface GatheringExpensesProps {
  expenses: GatheringExpense[];
  canDelete: boolean;
  onDelete: (expenseId: string) => void;
}

export const GatheringExpenses: FC<GatheringExpensesProps> = ({ expenses, canDelete, onDelete }) => (
  <GatheringSection label="Gastos registrados">
    <Stack gap="3xs">
      {expenses.map(expense => (
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
            {canDelete && (
              <ActionIcon
                variant="subtle"
                color="gray"
                aria-label="Eliminar gasto"
                onClick={() => onDelete(expense.id)}
              >
                <XIcon size="1rem" />
              </ActionIcon>
            )}
          </Group>
        </Paper>
      ))}
    </Stack>
  </GatheringSection>
);
