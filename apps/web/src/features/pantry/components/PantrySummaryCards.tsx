import { FC } from 'react';
import { SimpleGrid } from '@mantine/core';

import { StatCard } from '@/shared/ui';

import type { PantryAlertFilter, PantrySummary } from '@omni/shared/pantry';

import { PANTRY_EXPIRING_SOON_DAYS } from '@omni/shared/pantry';

interface PantrySummaryCardsProps {
  summary: PantrySummary;
  alert: PantryAlertFilter;
  onAlertChange: (alert: PantryAlertFilter) => void;
  onOpenShoppingList: () => void;
}

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
