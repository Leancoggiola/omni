import { FONT_SIZE, LINE_HEIGHT, RADIUS, SPACING } from '@omni/shared/theme';
import { ArrowDownIcon, ArrowUpIcon, DotsSixVerticalIcon } from 'phosphor-react-native';
import { XStack, YStack } from 'tamagui';

import { useColorSchemeControl, useSemanticColors } from '@/core/theme';
import { IconButton, Paragraph } from '@/shared/ui';
import { glassElevation } from '@/theme/elevation';

import { formatSetsReps } from '../utils/gymFormat';

import type { GymExercise } from '@omni/shared/gym';

type ReorderRowProps = {
  exercise: GymExercise;
  isFirst: boolean;
  isLast: boolean;
  onMove: (direction: -1 | 1) => void;
};

/** Fila de "Ordenar el día": el ejercicio y las flechas para subirlo o bajarlo (deshabilitadas en los extremos). */
export function ReorderRow({ exercise, isFirst, isLast, onMove }: ReorderRowProps) {
  const colors = useSemanticColors();
  const { colorScheme } = useColorSchemeControl();

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
      <YStack accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <DotsSixVerticalIcon size={20} color={colors.dimmed} />
      </YStack>
      <YStack flex={1} gap={SPACING['3xs']}>
        <Paragraph fontSize={FONT_SIZE.lg} lineHeight={`${LINE_HEIGHT.xl}px`} fontWeight="600" numberOfLines={2}>
          {exercise.name}
        </Paragraph>
        <Paragraph color="dimmed" fontSize={FONT_SIZE.sm} numberOfLines={1}>
          {formatSetsReps(exercise.sets, exercise.reps)}
        </Paragraph>
      </YStack>
      <IconButton
        icon={ArrowUpIcon}
        variant="light"
        size="lg"
        accessibilityLabel={`Subir ${exercise.name}`}
        disabled={isFirst}
        onPress={() => onMove(-1)}
      />
      <IconButton
        icon={ArrowDownIcon}
        variant="light"
        size="lg"
        accessibilityLabel={`Bajar ${exercise.name}`}
        disabled={isLast}
        onPress={() => onMove(1)}
      />
    </XStack>
  );
}
