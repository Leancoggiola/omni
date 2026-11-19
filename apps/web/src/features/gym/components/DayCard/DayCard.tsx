import { FC, Fragment } from 'react';
import { ActionIcon, Divider, Group, Menu, Paper, Stack, Text, Title } from '@mantine/core';

import { useDisplayStyles } from '@/shared/ui';

import { DayReorderList } from './DayReorderList';
import { ExerciseRow } from './ExerciseRow';

import type { SaveOrderResult } from './DayReorderList';
import type { GymExercise, GymPlanDay } from '@omni/shared/gym';

import { GYM_WEEKDAY_LABELS } from '@omni/shared/gym';
import { ArrowsDownUpIcon, CalendarBlankIcon, DotsThreeIcon, PlusIcon, TrashIcon } from '@phosphor-icons/react';

interface DayCardProps {
  day: GymPlanDay;
  readOnly: boolean;
  ordering: boolean;
  locked: boolean;
  reorderKey: number;
  onOpenWeight: (exercise: GymExercise, dayLabel: string) => void;
  onEdit: (exercise: GymExercise, dayLabel: string) => void;
  onMove: (exercise: GymExercise, dayLabel: string) => void;
  onRemove: (exercise: GymExercise, dayLabel: string) => void;
  onAddToDay: (day: GymPlanDay) => void;
  onStartOrdering: (day: GymPlanDay) => void;
  onChangeDay: (day: GymPlanDay) => void;
  onDeleteDay: (day: GymPlanDay) => void;
  onSaveOrder: (day: GymPlanDay, exerciseIds: string[]) => Promise<SaveOrderResult>;
  onCancelOrdering: () => void;
  onReloadDay: () => Promise<void>;
}

/**
 * Un día del plan: título, cantidad de ejercicios, el menú "⋯" del día (agregar a este día, ordenar, cambiar de día,
 * borrar) y sus filas. "Ordenar ejercicios" solo aparece con 2 ejercicios o más y pasa la tarjeta a modo orden. Un
 * plan archivado se ve sin menús.
 */
export const DayCard: FC<DayCardProps> = ({
  day,
  readOnly,
  ordering,
  locked,
  reorderKey,
  onOpenWeight,
  onEdit,
  onMove,
  onRemove,
  onAddToDay,
  onStartOrdering,
  onChangeDay,
  onDeleteDay,
  onSaveOrder,
  onCancelOrdering,
  onReloadDay,
}) => {
  const titleStyles = useDisplayStyles('md');
  const label = GYM_WEEKDAY_LABELS[day.weekday];
  const titleId = `gym-day-${day.id}`;
  const count = day.exercises.length;
  const lowerLabel = label.toLowerCase();

  return (
    <Paper component="section" aria-labelledby={titleId}>
      <Group justify="space-between" align="flex-start" wrap="nowrap" mb="xs">
        <Stack gap="none">
          <Title order={2} id={titleId} {...titleStyles}>
            {label}
          </Title>
          <Text size="xs" c="dimmed">
            {count === 1 ? '1 ejercicio' : `${count} ejercicios`}
          </Text>
        </Stack>
        {!readOnly && !ordering && (
          <Menu position="bottom-end" withinPortal>
            <Menu.Target>
              <ActionIcon
                variant="subtle"
                color="gray"
                size="lg"
                disabled={locked}
                aria-label={`Opciones del ${lowerLabel}`}
              >
                <DotsThreeIcon size="1.25rem" weight="bold" />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item leftSection={<PlusIcon size="1rem" />} onClick={() => onAddToDay(day)}>
                Agregar ejercicio a este día
              </Menu.Item>
              {count > 1 && (
                <Menu.Item leftSection={<ArrowsDownUpIcon size="1rem" />} onClick={() => onStartOrdering(day)}>
                  Ordenar ejercicios
                </Menu.Item>
              )}
              <Menu.Item leftSection={<CalendarBlankIcon size="1rem" />} onClick={() => onChangeDay(day)}>
                Cambiar de día
              </Menu.Item>
              <Menu.Divider />
              <Menu.Item color="destructive" leftSection={<TrashIcon size="1rem" />} onClick={() => onDeleteDay(day)}>
                Borrar día
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        )}
      </Group>

      {ordering ? (
        <DayReorderList
          key={reorderKey}
          exercises={day.exercises}
          dayLabel={label}
          onSave={exerciseIds => onSaveOrder(day, exerciseIds)}
          onCancel={onCancelOrdering}
          onReload={onReloadDay}
        />
      ) : (
        day.exercises.map((exercise, index) => (
          <Fragment key={exercise.id}>
            {index > 0 && <Divider />}
            <ExerciseRow
              exercise={exercise}
              dayLabel={label}
              readOnly={readOnly}
              locked={locked}
              onOpenWeight={onOpenWeight}
              onEdit={onEdit}
              onMove={onMove}
              onRemove={onRemove}
            />
          </Fragment>
        ))
      )}
    </Paper>
  );
};
