import { FC, useState } from 'react';
import { Alert, Box, Button, Group, Modal, Paper, Stack, Text } from '@mantine/core';

import { formatSetsAndReps, formatVariantShort, formatWeightKg, formatWeightNumber } from '../../utils/gymFormat';
import { parseWeight, weightError } from '../../utils/gymWeight';
import { ExerciseTile } from '../ExerciseTile';
import { WeightHistory } from './WeightHistory';
import { WeightStepper } from './WeightStepper';

import type { GymSubmitResult } from '../../utils/gymSubmit';
import type { GymExercise } from '@omni/shared/gym';

interface WeightModalProps {
  opened: boolean;
  onClose: () => void;
  exercise: GymExercise | null;
  dayLabel: string;
  readOnly: boolean;
  onSave: (exercise: GymExercise, weightKg: number | null) => Promise<GymSubmitResult>;
}

interface WeightContentProps extends Omit<WeightModalProps, 'opened' | 'dayLabel'> {
  exercise: GymExercise;
  onBusyChange: (busy: boolean) => void;
}

/**
 * Vive dentro del modal: se desmonta al cerrarlo, así que cada apertura arranca del peso actual (o de "—" si no tiene).
 * Guardar queda deshabilitado hasta que haya un número válido y distinto del actual; "Quitar peso" solo aparece si hay
 * peso, no pide confirmación y no toca el historial.
 */
const WeightContent: FC<WeightContentProps> = ({ exercise, readOnly, onClose, onSave, onBusyChange }) => {
  const current = exercise.currentWeightKg;
  const [value, setValue] = useState<number | string>(current ?? '');
  const [saving, setSaving] = useState<'save' | 'clear' | null>(null);

  const error = weightError(value);
  const nextWeight = parseWeight(value);
  const canSave = nextWeight !== null && error === null && nextWeight !== current;
  const variant = formatVariantShort(exercise.sets, exercise.reps);

  const save = async (weightKg: number | null, action: 'save' | 'clear') => {
    if (saving) return;
    setSaving(action);
    onBusyChange(true);
    try {
      const result = await onSave(exercise, weightKg);
      if (result.status === 'done') onClose();
    } finally {
      setSaving(null);
      onBusyChange(false);
    }
  };

  if (readOnly) {
    return (
      <Stack gap="md">
        <Alert color="warning" title="Plan archivado">
          Solo podés ver el peso y su historial. Para cargar uno nuevo, desarchivá el plan.
        </Alert>
        <Paper withBorder p="sm" ta="center">
          <Text fw={800} fz="2rem" lh={1}>
            {current === null ? '—' : formatWeightNumber(current)}
          </Text>
          <Text size="xs" c="dimmed">
            {current === null ? 'kg · sin peso' : 'kg · peso actual'}
          </Text>
        </Paper>
        <WeightHistory exerciseId={exercise.id} readOnly />
        <Group justify="flex-end" mt="sm">
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </Group>
      </Stack>
    );
  }

  return (
    <Stack gap="md">
      <WeightStepper value={value} previous={current} error={error} onChange={setValue} />

      <WeightHistory exerciseId={exercise.id} readOnly={false} />

      <Text size="xs" c="dimmed">
        {current === null
          ? `El peso es el mismo en todos tus planes que usan ${exercise.name} ${variant}.`
          : `Quitar el peso lo borra en todos tus planes que usan ${exercise.name} ${variant}. El historial se conserva.`}
      </Text>

      <Group justify="space-between" gap="sm" mt="sm">
        <Box>
          {current !== null && (
            <Button
              variant="subtle"
              color="destructive"
              loading={saving === 'clear'}
              disabled={saving === 'save'}
              onClick={() => void save(null, 'clear')}
            >
              Quitar peso
            </Button>
          )}
        </Box>
        <Group gap="sm">
          <Button variant="outline" onClick={onClose} disabled={saving !== null}>
            Cancelar
          </Button>
          <Button
            loading={saving === 'save'}
            disabled={!canSave || saving === 'clear'}
            onClick={() => void save(nextWeight, 'save')}
          >
            Guardar peso
          </Button>
        </Group>
      </Group>
    </Stack>
  );
};

/** Modal del peso de un ejercicio: ajustarlo (de a 2,5 kg o escribiéndolo), quitarlo y ver su historial. */
export const WeightModal: FC<WeightModalProps> = ({ opened, onClose, exercise, dayLabel, readOnly, onSave }) => {
  const [busy, setBusy] = useState(false);

  return (
    <Modal
      opened={opened && exercise !== null}
      onClose={() => {
        if (!busy) onClose();
      }}
      centered
      size="md"
      closeOnClickOutside={!busy}
      closeOnEscape={!busy}
      withCloseButton={!busy}
      title={
        exercise && (
          <Group gap="sm" wrap="nowrap">
            <ExerciseTile size="3rem" />
            <Stack gap="none">
              <Text inherit>{exercise.name}</Text>
              <Text size="sm" c="dimmed" ff="text" fw={400}>
                {[
                  formatSetsAndReps(exercise.sets, exercise.reps),
                  dayLabel,
                  exercise.currentWeightKg === null ? null : formatWeightKg(exercise.currentWeightKg),
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            </Stack>
          </Group>
        )
      }
    >
      {exercise && (
        <WeightContent
          exercise={exercise}
          readOnly={readOnly}
          onClose={onClose}
          onSave={onSave}
          onBusyChange={setBusy}
        />
      )}
    </Modal>
  );
};
