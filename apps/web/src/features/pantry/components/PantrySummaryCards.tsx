import { FC } from 'react';
import { Paper, SimpleGrid, Stack, Text } from '@mantine/core';

import type { PantryAlertFilter } from '../types';
import type { PantrySummary } from '@omni/shared/pantry';
import type { ReactNode } from 'react';

import { PANTRY_EXPIRING_SOON_DAYS } from '@omni/shared/pantry';

interface PantrySummaryCardsProps {
  summary: PantrySummary;
  alert: PantryAlertFilter;
  onAlertChange: (alert: PantryAlertFilter) => void;
  onOpenShoppingList: () => void;
}

interface StatCardProps {
  value: number;
  label: string;
  pressed?: boolean;
  onClick?: () => void;
  ariaLabel?: string;
}

const StatCard: FC<StatCardProps> = ({ value, label, pressed, onClick, ariaLabel }) => {
  const content: ReactNode = (
    <Stack gap="3xs">
      <Text fw={800} fz="2rem" lh={1}>
        {value}
      </Text>
      <Text size="sm" c="dimmed">
        {label}
      </Text>
    </Stack>
  );

  if (!onClick) {
    return (
      <Paper p="md" role="group" aria-label={ariaLabel ?? label}>
        {content}
      </Paper>
    );
  }

  return (
    <Paper
      component="button"
      type="button"
      p="md"
      ta="left"
      aria-pressed={pressed}
      aria-label={ariaLabel}
      bd={pressed ? '2px solid var(--mantine-primary-color-filled)' : undefined}
      style={{ cursor: 'pointer' }}
      onClick={onClick}
    >
      {content}
    </Paper>
  );
};

/**
 * Los cuatro contadores: total, bajo stock y por vencer (filtran la tabla al tocarlos, y al volver a tocar se
 * quitan) y la cantidad en la lista de compras, que lleva a esa pestaña.
 */
export const PantrySummaryCards: FC<PantrySummaryCardsProps> = ({
  summary,
  alert,
  onAlertChange,
  onOpenShoppingList,
}) => (
  <SimpleGrid cols={{ base: 2, md: 4 }} spacing="md">
    <StatCard value={summary.totalProducts} label="Productos" ariaLabel={`${summary.totalProducts} productos`} />
    <StatCard
      value={summary.lowStockCount}
      label="Bajo stock"
      pressed={alert === 'low'}
      onClick={() => onAlertChange(alert === 'low' ? 'all' : 'low')}
    />
    <StatCard
      value={summary.expiringSoonCount}
      label={`Por vencer en ${PANTRY_EXPIRING_SOON_DAYS} días`}
      pressed={alert === 'expiring'}
      onClick={() => onAlertChange(alert === 'expiring' ? 'all' : 'expiring')}
    />
    <StatCard
      value={summary.shoppingListCount}
      label="En la lista de compras"
      ariaLabel={`${summary.shoppingListCount} en la lista de compras`}
      onClick={onOpenShoppingList}
    />
  </SimpleGrid>
);
