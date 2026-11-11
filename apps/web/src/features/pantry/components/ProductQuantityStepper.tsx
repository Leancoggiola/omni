import { FC } from 'react';
import { ActionIcon, Group, Paper, Text } from '@mantine/core';

import type { PantryUnit } from '@omni/shared/pantry';

import { PANTRY_UNIT_LABELS } from '@omni/shared/pantry';
import { MinusIcon, PlusIcon } from '@phosphor-icons/react';

interface ProductQuantityStepperProps {
  value: number;
  unit: PantryUnit;
  minQuantity: number | null;
  onChange: (value: number) => void;
}

/** Ajuste rápido de la cantidad en la alacena (±1); se guarda con el resto del form. */
export const ProductQuantityStepper: FC<ProductQuantityStepperProps> = ({ value, unit, minQuantity, onChange }) => {
  const unitLabel = value === 1 ? PANTRY_UNIT_LABELS[unit].one : PANTRY_UNIT_LABELS[unit].other;

  return (
    <Paper withBorder p="sm" role="group" aria-label="Cantidad en la alacena">
      <Group justify="space-between" wrap="nowrap">
        <ActionIcon
          variant="filled"
          size="xl"
          radius="xl"
          aria-label="Restar uno"
          disabled={value <= 0}
          onClick={() => onChange(Math.max(0, value - 1))}
        >
          <MinusIcon size="1.25rem" weight="bold" />
        </ActionIcon>
        <div role="status" aria-live="polite" style={{ textAlign: 'center' }}>
          <Text fw={800} fz="2rem" lh={1}>
            {value}
          </Text>
          <Text size="xs" c="dimmed">
            {unitLabel}
            {minQuantity !== null ? ` · mínimo ${minQuantity}` : ''}
          </Text>
        </div>
        <ActionIcon variant="filled" size="xl" radius="xl" aria-label="Sumar uno" onClick={() => onChange(value + 1)}>
          <PlusIcon size="1.25rem" weight="bold" />
        </ActionIcon>
      </Group>
    </Paper>
  );
};
