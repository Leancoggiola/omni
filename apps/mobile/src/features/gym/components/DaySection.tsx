import { GYM_WEEKDAY_LABELS } from '@omni/shared/gym';
import { FONT_SIZE, SPACING } from '@omni/shared/theme';
import { DotsThreeIcon } from 'phosphor-react-native';
import { Paragraph, XStack, YStack } from 'tamagui';

import { IconButton } from '@/shared/ui';

import { formatExerciseCount } from '../utils/gymFormat';
import { ExerciseRow } from './ExerciseRow';
import { SectionLabel } from './SectionLabel';

import type { GymExercise, GymPlanDay } from '@omni/shared/gym';
import type { LayoutChangeEvent } from 'react-native';

type DaySectionProps = {
  day: GymPlanDay;
  readOnly: boolean;
  onWeightPress: (exercise: GymExercise, day: GymPlanDay) => void;
  onExercisePress?: (exercise: GymExercise, day: GymPlanDay) => void;
  onMenuPress?: (day: GymPlanDay) => void;
  onLayout?: (event: LayoutChangeEvent) => void;
};

/**
 * Un día del plan: "LUNES", su cantidad de ejercicios y el "⋯" del día (agregar a este día, ordenar, cambiar de día,
 * borrar), y los ejercicios en su orden. Sin `onExercisePress` ni `onMenuPress` (plan archivado) las filas no se tocan
 * y no hay menú. `onLayout` informa dónde quedó la sección, para que la tira de días pueda llevar hasta ella.
 */
export function DaySection({ day, readOnly, onWeightPress, onExercisePress, onMenuPress, onLayout }: DaySectionProps) {
  const label = GYM_WEEKDAY_LABELS[day.weekday];

  return (
    <YStack gap={SPACING.sm} onLayout={onLayout}>
      <XStack alignItems="center" justifyContent="space-between" gap={SPACING.sm}>
        <SectionLabel>{label}</SectionLabel>
        <XStack alignItems="center" gap={SPACING.xs}>
          <Paragraph color="dimmed" fontSize={FONT_SIZE.sm}>
            {formatExerciseCount(day.exercises.length)}
          </Paragraph>
          {onMenuPress ? (
            <IconButton
              icon={DotsThreeIcon}
              variant="subtle"
              size="sm"
              accessibilityLabel={`Opciones del ${label.toLowerCase()}`}
              onPress={() => onMenuPress(day)}
            />
          ) : null}
        </XStack>
      </XStack>
      {day.exercises.map(exercise => (
        <ExerciseRow
          key={exercise.id}
          exercise={exercise}
          readOnly={readOnly}
          onWeightPress={pressed => onWeightPress(pressed, day)}
          onPress={onExercisePress ? pressed => onExercisePress(pressed, day) : undefined}
        />
      ))}
    </YStack>
  );
}
