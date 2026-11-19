import { FC, useState } from 'react';
import { Box, Button, Group, Modal, Select, Stack, Text } from '@mantine/core';

import { useGymSubmit } from '../hooks/useGymSubmit';
import { formatSetsAndReps, formatWeightKg } from '../utils/gymFormat';
import { ExerciseTile } from './ExerciseTile';
import { GymFormBanner } from './GymFormBanner';

import type { GymSubmitResult } from '../utils/gymSubmit';
import type { GymExercise, GymWeekday } from '@omni/shared/gym';

import { GYM_WEEKDAY_LABELS, GYM_WEEKDAYS } from '@omni/shared/gym';

interface MoveExerciseTarget {
  exercise: GymExercise;
  weekday: GymWeekday;
  occupiedWeekdays: GymWeekday[];
}

interface MoveExerciseModalProps {
  opened: boolean;
  target: MoveExerciseTarget | null;
  onClose: () => void;
  onSubmit: (exerciseId: string, weekday: GymWeekday) => Promise<GymSubmitResult>;
}

interface MoveExerciseFormProps {
  target: MoveExerciseTarget;
  loading: boolean;
  conflict: string | null;
  onSubmit: (weekday: GymWeekday) => Promise<void>;
  onCancel: () => void;
}

const MoveExerciseForm: FC<MoveExerciseFormProps> = ({ target, loading, conflict, onSubmit, onCancel }) => {
  const [weekday, setWeekday] = useState<GymWeekday | null>(null);
  const originLabel = GYM_WEEKDAY_LABELS[target.weekday].toLowerCase();
  const data = GYM_WEEKDAYS.filter(value => value !== target.weekday).map(value => {
    const occupied = target.occupiedWeekdays.includes(value);
    return {
      value,
      label: occupied ? `${GYM_WEEKDAY_LABELS[value]} · ya lo tiene` : GYM_WEEKDAY_LABELS[value],
      disabled: occupied,
    };
  });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (weekday) await onSubmit(weekday);
  };

  return (
    <Box component="form" noValidate onSubmit={event => void handleSubmit(event)}>
      <Stack gap="md">
        {conflict && <GymFormBanner message={conflict} help="Elegí otro día." />}
        <Select
          label="Mover a"
          placeholder="Elegí un día"
          withAsterisk
          data-autofocus
          allowDeselect={false}
          data={data}
          value={weekday}
          onChange={value => setWeekday(value as GymWeekday | null)}
        />
        <Text size="xs" c="dimmed">
          {`Va al final del día elegido y solo cambia en este plan. Los días que ya tienen este ejercicio no se pueden elegir. Si el ${originLabel} se queda sin ejercicios, se borra.`}
        </Text>
        <Group justify="flex-end" gap="sm" mt="sm">
          <Button variant="outline" type="button" onClick={onCancel} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" loading={loading} disabled={weekday === null}>
            Mover ejercicio
          </Button>
        </Group>
      </Stack>
    </Box>
  );
};

/** Mover un ejercicio a otro día del plan (al final del día elegido). Los días donde la variante ya está salen deshabilitados. */
export const MoveExerciseModal: FC<MoveExerciseModalProps> = ({ opened, target, onClose, onSubmit }) => {
  const { loading, conflict, submit, reset } = useGymSubmit<GymWeekday>(weekday =>
    target ? onSubmit(target.exercise.id, weekday) : Promise.resolve({ status: 'failed' })
  );

  const handleClose = () => {
    if (loading) return;
    reset();
    onClose();
  };

  const { exercise } = target ?? {};

  return (
    <Modal
      opened={opened && target !== null}
      onClose={handleClose}
      centered
      closeOnClickOutside={!loading}
      closeOnEscape={!loading}
      title={
        exercise &&
        target && (
          <Group gap="sm" wrap="nowrap">
            <ExerciseTile size="3rem" />
            <Stack gap="none">
              <Text inherit>{exercise.name}</Text>
              <Text size="sm" c="dimmed" ff="text" fw={400}>
                {[
                  formatSetsAndReps(exercise.sets, exercise.reps),
                  GYM_WEEKDAY_LABELS[target.weekday],
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
      {target && (
        <MoveExerciseForm
          target={target}
          loading={loading}
          conflict={conflict}
          onSubmit={submit}
          onCancel={handleClose}
        />
      )}
    </Modal>
  );
};
