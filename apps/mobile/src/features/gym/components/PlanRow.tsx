import { FONT_SIZE, LINE_HEIGHT, RADIUS, SPACING } from '@omni/shared/theme';
import { CaretRightIcon } from 'phosphor-react-native';
import { Paragraph, XStack, YStack } from 'tamagui';

import { useColorSchemeControl, useSemanticColors } from '@/core/theme';
import { glassElevation } from '@/theme/elevation';

import { formatPlanCounts } from '../utils/gymFormat';
import { ExerciseTile } from './ExerciseTile';

import type { GymPlanSummary } from '@omni/shared/gym';

type PlanRowProps = {
  plan: GymPlanSummary;
  onPress: (plan: GymPlanSummary) => void;
};

/** Plan de "Tus planes": nombre y "3 días · 8 ejercicios"; tocarlo lo abre en la pantalla del gimnasio. */
export function PlanRow({ plan, onPress }: PlanRowProps) {
  const colors = useSemanticColors();
  const { colorScheme } = useColorSchemeControl();
  const counts = formatPlanCounts(plan.dayCount, plan.exerciseCount);

  return (
    <XStack
      backgroundColor="surfaceGlass"
      borderWidth={1}
      borderColor="glassBorder"
      borderRadius={RADIUS.xl}
      padding={SPACING.sm}
      gap={SPACING.sm}
      alignItems="center"
      opacity="press:0.8"
      {...glassElevation('card', colorScheme)}
      onPress={() => onPress(plan)}
      accessible
      accessibilityRole="button"
      accessibilityLabel={`${plan.name}, ${counts}`}
      accessibilityHint="Abre el plan"
    >
      <ExerciseTile />
      <YStack flex={1} gap={SPACING['3xs']}>
        <Paragraph
          fontSize={FONT_SIZE.lg}
          lineHeight={`${LINE_HEIGHT.xl}px`}
          fontWeight="600"
          numberOfLines={1}
          userSelect="none"
        >
          {plan.name}
        </Paragraph>
        <Paragraph color="dimmed" fontSize={FONT_SIZE.sm} numberOfLines={1} userSelect="none">
          {counts}
        </Paragraph>
      </YStack>
      <CaretRightIcon size={20} color={colors.dimmed} />
    </XStack>
  );
}
