import { FC } from 'react';
import { ActionIcon, Button, Group, Menu, Stack, Text } from '@mantine/core';

import { formatSetsAndReps, formatWeightKg } from '../../utils/gymFormat';
import { ExerciseTile } from '../ExerciseTile';

import type { GymExercise } from '@omni/shared/gym';

import classes from './ExerciseRow.module.scss';

import { ArrowsLeftRightIcon, DotsThreeIcon, PencilSimpleIcon, TrashIcon } from '@phosphor-icons/react';

interface ExerciseRowProps {
  exercise: GymExercise;
  dayLabel: string;
  readOnly: boolean;
  locked: boolean;
  onOpenWeight: (exercise: GymExercise, dayLabel: string) => void;
  onEdit: (exercise: GymExercise, dayLabel: string) => void;
  onMove: (exercise: GymExercise, dayLabel: string) => void;
  onRemove: (exercise: GymExercise, dayLabel: string) => void;
}

/**
 * Fila de un ejercicio: nombre, series y repeticiones, el peso (al tocarlo abre el modal de peso e historial) y el
 * menú "⋯" con Editar, Mover de día y Quitar del día. Sin peso muestra "Cargar peso"; en un plan archivado no hay
 * menú y el peso solo abre el historial.
 */
export const ExerciseRow: FC<ExerciseRowProps> = ({
  exercise,
  dayLabel,
  readOnly,
  locked,
  onOpenWeight,
  onEdit,
  onMove,
  onRemove,
}) => {
  const { name, sets, reps, currentWeightKg } = exercise;

  const renderWeight = () => {
    if (readOnly) {
      return (
        <Button
          variant="subtle"
          color="gray"
          radius="full"
          fw={currentWeightKg === null ? 400 : 700}
          c={currentWeightKg === null ? undefined : 'var(--mantine-color-text)'}
          className={classes.weight}
          aria-label={`${currentWeightKg === null ? 'Sin peso' : formatWeightKg(currentWeightKg)}, ver historial de ${name}`}
          onClick={() => onOpenWeight(exercise, dayLabel)}
        >
          {currentWeightKg === null ? 'Sin peso' : formatWeightKg(currentWeightKg)}
        </Button>
      );
    }
    if (currentWeightKg !== null) {
      return (
        <Button
          variant="subtle"
          color="gray"
          radius="full"
          fw={700}
          c="var(--mantine-color-text)"
          className={classes.weight}
          disabled={locked}
          aria-label={`Peso de ${name}: ${formatWeightKg(currentWeightKg)}`}
          onClick={() => onOpenWeight(exercise, dayLabel)}
        >
          {formatWeightKg(currentWeightKg)}
        </Button>
      );
    }
    return (
      <Button
        variant="outline"
        color="gray"
        radius="full"
        style={{ borderStyle: 'dashed' }}
        disabled={locked}
        aria-label={`Cargar peso de ${name}`}
        onClick={() => onOpenWeight(exercise, dayLabel)}
      >
        Cargar peso
      </Button>
    );
  };

  return (
    <Group gap="md" wrap="nowrap" py="sm">
      <ExerciseTile />
      <Stack gap="none" flex={1} miw={0}>
        <Text fw={700} lineClamp={2}>
          {name}
        </Text>
        <Text size="sm" c="dimmed">
          {formatSetsAndReps(sets, reps)}
        </Text>
      </Stack>
      {renderWeight()}
      {!readOnly && (
        <Menu position="bottom-end" withinPortal>
          <Menu.Target>
            <ActionIcon variant="subtle" color="gray" disabled={locked} aria-label={`Opciones de ${name}`}>
              <DotsThreeIcon size="1.25rem" weight="bold" />
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item leftSection={<PencilSimpleIcon size="1rem" />} onClick={() => onEdit(exercise, dayLabel)}>
              Editar
            </Menu.Item>
            <Menu.Item leftSection={<ArrowsLeftRightIcon size="1rem" />} onClick={() => onMove(exercise, dayLabel)}>
              Mover de día
            </Menu.Item>
            <Menu.Divider />
            <Menu.Item
              color="destructive"
              leftSection={<TrashIcon size="1rem" />}
              onClick={() => onRemove(exercise, dayLabel)}
            >
              Quitar del día
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      )}
    </Group>
  );
};
