import { FONT_SIZE, RADIUS, SPACING } from '@omni/shared/theme';
import { Paragraph, XStack, YStack } from 'tamagui';

import { Badge } from '@/shared/ui';

import { formatSetsReps, formatWeightKg } from '../utils/gymFormat';

import type { GymCatalogExercise } from '@omni/shared/gym';

type CatalogSuggestionRowProps = {
  suggestion: GymCatalogExercise;
  selected: boolean;
  onPress: (suggestion: GymCatalogExercise) => void;
};

/**
 * Variante del catálogo sugerida al escribir el nombre: tocarla completa nombre, series y repeticiones. Muestra su peso
 * o "Sin peso"; `selected` marca la que coincide exacto con lo cargado en el formulario.
 */
export function CatalogSuggestionRow({ suggestion, selected, onPress }: CatalogSuggestionRowProps) {
  const details = formatSetsReps(suggestion.sets, suggestion.reps);
  const weight = suggestion.currentWeightKg === null ? null : formatWeightKg(suggestion.currentWeightKg);

  return (
    <XStack
      alignItems="center"
      gap={SPACING.sm}
      paddingVertical={SPACING.xs}
      paddingHorizontal={SPACING.sm}
      borderRadius={RADIUS.lg}
      backgroundColor={selected ? 'primarySurface' : 'transparent'}
      opacity="press:0.6"
      onPress={() => onPress(suggestion)}
      accessible
      accessibilityRole="button"
      accessibilityLabel={`Usar ${suggestion.name}, ${details}, ${weight ?? 'sin peso'}`}
      accessibilityState={{ selected }}
    >
      <YStack flex={1} gap={SPACING['3xs']}>
        <Paragraph fontWeight="600" numberOfLines={1}>
          {suggestion.name}
        </Paragraph>
        <Paragraph color="dimmed" fontSize={FONT_SIZE.sm} numberOfLines={1}>
          {details}
        </Paragraph>
      </YStack>
      <Badge color={weight === null ? 'dimmed' : 'accent'} size="md" alignSelf="center">
        {weight ?? 'Sin peso'}
      </Badge>
    </XStack>
  );
}
