import { FC } from 'react';
import { Badge, Button, Group, SegmentedControl } from '@mantine/core';

import { PageHeader } from '@/shared/ui';

import { PantryLiveIndicator } from './PantryLiveIndicator';

import type { PantryTab } from '../types';

import { PackageIcon, PlusIcon } from '@phosphor-icons/react';

interface PantryHeaderProps {
  tab: PantryTab;
  onTabChange: (tab: PantryTab) => void;
  pendingCount: number | undefined;
  linked: boolean;
  onAddProduct: () => void;
}

/**
 * Título, pestañas Inventario / Lista de compras (con el contador de pendientes) y "Agregar producto". En la lista de
 * un hogar compartido (`linked`) avisa que se actualiza sola.
 */
export const PantryHeader: FC<PantryHeaderProps> = ({ tab, onTabChange, pendingCount, linked, onAddProduct }) => (
  <PageHeader
    icon={<PackageIcon size="1.5rem" />}
    title="Tu alacena"
    accent="alacena"
    subtitle="Tu inventario y la lista de compras"
    actions={
      <Group gap="sm" wrap="wrap">
        {tab === 'shopping' && linked && <PantryLiveIndicator />}
        <SegmentedControl
          aria-label="Alacena"
          value={tab}
          onChange={value => onTabChange(value as PantryTab)}
          data={[
            { value: 'inventory', label: 'Inventario' },
            {
              value: 'shopping',
              label: (
                <Group gap="xs" wrap="nowrap" justify="center">
                  Lista de compras
                  {pendingCount ? (
                    <Badge
                      size="sm"
                      circle
                      variant="light"
                      color="terracotta"
                      aria-label={`${pendingCount} pendientes`}
                    >
                      {pendingCount}
                    </Badge>
                  ) : null}
                </Group>
              ),
            },
          ]}
        />
        {tab === 'inventory' && (
          <Button leftSection={<PlusIcon size="1rem" weight="bold" />} onClick={onAddProduct}>
            Agregar producto
          </Button>
        )}
      </Group>
    }
  />
);
