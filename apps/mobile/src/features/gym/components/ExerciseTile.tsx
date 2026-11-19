import { RADIUS } from '@omni/shared/theme';
import { YStack } from 'tamagui';

import { useSemanticColors } from '@/core/theme';
import { NAV_ICONS } from '@/shared/navigation';

const TILE_SIZE = 44;

/** Cuadro del ícono del gimnasio (la pesa del módulo) en `primarySurface`: filas de ejercicio, de plan y la hoja de peso. */
export function ExerciseTile() {
  const colors = useSemanticColors();
  const IconComponent = NAV_ICONS.gym;

  return (
    <YStack
      width={TILE_SIZE}
      height={TILE_SIZE}
      borderRadius={RADIUS.md}
      backgroundColor="primarySurface"
      alignItems="center"
      justifyContent="center"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <IconComponent size={20} color={colors.primary} />
    </YStack>
  );
}
