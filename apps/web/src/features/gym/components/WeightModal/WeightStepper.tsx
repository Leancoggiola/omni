import { FC } from 'react';
import { ActionIcon, Group, NumberInput, Paper, Stack, Text } from '@mantine/core';

import { formatWeightKg } from '../../utils/gymFormat';
import { parseWeight, stepWeight, WEIGHT_MAX_KG, WEIGHT_STEP_KG } from '../../utils/gymWeight';

import { MinusIcon, PlusIcon } from '@phosphor-icons/react';

const STEP_LABEL = formatWeightKg(WEIGHT_STEP_KG);

/** Texto bajo el número: "todavía sin peso", "peso actual" mientras no cambia, o "antes X" una vez que cambia. */
function describePrevious(previous: number | null, next: number | null): string {
  if (previous === null) return 'kg · todavía sin peso';
  return next === previous ? 'kg · peso actual' : `kg · antes ${formatWeightKg(previous)}`;
}

interface WeightStepperProps {
  value: number | string;
  previous: number | null;
  error: string | null;
  onChange: (value: number | string) => void;
}

/**
 * − / + de a 2,5 kg alrededor del peso, que también se puede escribir (coma, hasta 2 decimales). Sin peso muestra
 * "—" y el "+" arranca en 2,5. Debajo, el peso anterior (o "todavía sin peso") y, si el valor no es válido, el error.
 */
export const WeightStepper: FC<WeightStepperProps> = ({ value, previous, error, onChange }) => {
  const numeric = parseWeight(value) ?? 0;
  const caption = describePrevious(previous, parseWeight(value));

  return (
    <Stack gap="xs">
      <Paper withBorder p="sm" role="group" aria-label="Peso">
        <Group justify="space-between" wrap="nowrap">
          <ActionIcon
            variant="filled"
            size="xl"
            radius="xl"
            aria-label={`Restar ${STEP_LABEL}`}
            disabled={numeric <= 0}
            onClick={() => onChange(stepWeight(numeric, -1))}
          >
            <MinusIcon size="1.25rem" weight="bold" />
          </ActionIcon>
          <Stack gap="none" flex={1} miw={0} ta="center">
            <NumberInput
              variant="unstyled"
              aria-label="Peso en kg"
              placeholder="—"
              value={value}
              onChange={onChange}
              error={error !== null}
              allowNegative
              decimalScale={2}
              decimalSeparator=","
              thousandSeparator="."
              hideControls
              styles={{
                input: { textAlign: 'center', fontSize: '2rem', fontWeight: 800, height: 'auto', lineHeight: 1 },
              }}
            />
            <Text size="xs" c="dimmed">
              {caption}
            </Text>
          </Stack>
          <ActionIcon
            variant="filled"
            size="xl"
            radius="xl"
            aria-label={`Sumar ${STEP_LABEL}`}
            disabled={numeric >= WEIGHT_MAX_KG}
            onClick={() => onChange(stepWeight(numeric, 1))}
          >
            <PlusIcon size="1.25rem" weight="bold" />
          </ActionIcon>
        </Group>
      </Paper>
      {error && (
        <Text size="sm" c="destructive" role="alert">
          {error}
        </Text>
      )}
    </Stack>
  );
};
