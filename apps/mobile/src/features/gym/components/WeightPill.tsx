import { FONT_SIZE, RADIUS, SIZE, SPACING } from '@omni/shared/theme';
import { Paragraph, XStack } from 'tamagui';

import { Badge } from '@/shared/ui';

import { formatWeightKg } from '../utils/gymFormat';

type WeightPillProps = {
  exerciseName: string;
  weightKg: number | null;
  readOnly: boolean;
  onPress: () => void;
};

/**
 * Peso actual de un ejercicio, que abre la hoja de peso. En un plan activo es una pill con borde ("60 kg") o, sin peso,
 * con borde punteado ("Cargar peso"); en uno archivado es un `Badge` gris que abre la hoja solo para mirar el
 * historial. Mide 44 de alto: es el área de toque de la fila.
 */
export function WeightPill({ exerciseName, weightKg, readOnly, onPress }: WeightPillProps) {
  const label = weightKg === null ? 'Cargar peso' : formatWeightKg(weightKg);
  const a11yLabel = readOnly
    ? `${exerciseName}: ${weightKg === null ? 'sin peso' : label}. Ver historial`
    : weightKg === null
      ? `Cargar peso de ${exerciseName}`
      : `${exerciseName}: ${label}. Cambiar peso`;

  return (
    <XStack
      height={SIZE.control.md}
      minWidth={SIZE.control.md}
      paddingHorizontal={readOnly ? undefined : SPACING.md}
      alignItems="center"
      justifyContent="center"
      borderRadius={RADIUS.full}
      borderWidth={readOnly ? 0 : 1}
      borderStyle={!readOnly && weightKg === null ? 'dashed' : 'solid'}
      borderColor="borderSubtle"
      opacity="press:0.7"
      onPress={onPress}
      accessible
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
    >
      {readOnly ? (
        <Badge color="dimmed" size="md">
          {label}
        </Badge>
      ) : (
        <Paragraph fontSize={FONT_SIZE.md} fontWeight={weightKg === null ? '600' : '700'}>
          {label}
        </Paragraph>
      )}
    </XStack>
  );
}
