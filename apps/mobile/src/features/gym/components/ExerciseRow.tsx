import { FONT_SIZE, LINE_HEIGHT, RADIUS, SPACING } from '@omni/shared/theme';
import { Paragraph, XStack, YStack } from 'tamagui';

import { useColorSchemeControl } from '@/core/theme';
import { glassElevation } from '@/theme/elevation';

import { formatSetsReps } from '../utils/gymFormat';
import { ExerciseTile } from './ExerciseTile';
import { WeightPill } from './WeightPill';

import type { GymExercise } from '@omni/shared/gym';

type ExerciseRowProps = {
  exercise: GymExercise;
  readOnly: boolean;
  onWeightPress: (exercise: GymExercise) => void;
  onPress?: (exercise: GymExercise) => void;
};

/**
 * Ejercicio del día: nombre, series y repeticiones y el peso actual. El ícono y el texto abren las opciones del
 * ejercicio; el peso es un botón aparte que abre su hoja (si toda la card fuera el botón, el lector de pantalla no
 * llegaría al peso). Sin `onPress` (plan archivado) la fila no se toca.
 */
export function ExerciseRow({ exercise, readOnly, onWeightPress, onPress }: ExerciseRowProps) {
  const { colorScheme } = useColorSchemeControl();
  const details = formatSetsReps(exercise.sets, exercise.reps);

  return (
    <XStack
      backgroundColor="surfaceGlass"
      borderWidth={1}
      borderColor="glassBorder"
      borderRadius={RADIUS.xl}
      padding={SPACING.sm}
      gap={SPACING.sm}
      alignItems="center"
      {...glassElevation('card', colorScheme)}
    >
      <XStack
        flex={1}
        gap={SPACING.sm}
        alignItems="center"
        onPress={onPress ? () => onPress(exercise) : undefined}
        opacity={onPress ? 'press:0.7' : undefined}
        accessible={Boolean(onPress)}
        accessibilityRole={onPress ? 'button' : undefined}
        accessibilityLabel={onPress ? `${exercise.name}, ${details}` : undefined}
        accessibilityHint={onPress ? 'Abre las opciones del ejercicio' : undefined}
      >
        <ExerciseTile />
        <YStack flex={1} gap={SPACING['3xs']}>
          <Paragraph fontSize={FONT_SIZE.lg} lineHeight={`${LINE_HEIGHT.xl}px`} fontWeight="600" numberOfLines={2}>
            {exercise.name}
          </Paragraph>
          <Paragraph color="dimmed" fontSize={FONT_SIZE.sm} numberOfLines={1}>
            {details}
          </Paragraph>
        </YStack>
      </XStack>
      <WeightPill
        exerciseName={exercise.name}
        weightKg={exercise.currentWeightKg}
        readOnly={readOnly}
        onPress={() => onWeightPress(exercise)}
      />
    </XStack>
  );
}
