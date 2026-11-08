import { RADIUS, SIZE, SPACING } from '@omni/shared/theme';
import { PlusIcon } from 'phosphor-react-native';
import { XStack } from 'tamagui';

import { useColorSchemeControl, useSemanticColors } from '@/core/theme';
import { themedElevation } from '@/theme/elevation';

import { useTabBarClearance } from '../useTabBarClearance';

export const FAB_SIZE = SIZE.fab;

type FabProps = {
  onPress: () => void;
  accessibilityLabel: string;
};

/**
 * Botón flotante de "Agregar" sobre la tab bar (en web es el botón del `PageHeader`). Filled de marca (`primary-fill`),
 * de `SIZE.fab`, con la sombra `float`. `accessibilityLabel` es obligatorio: es lo único que anuncia el lector de
 * pantalla ("Agregar producto").
 */
export function Fab({ onPress, accessibilityLabel }: FabProps) {
  const colors = useSemanticColors();
  const { colorScheme } = useColorSchemeControl();
  const bottom = useTabBarClearance();

  return (
    <XStack
      theme="active"
      position="absolute"
      right={SPACING.md}
      bottom={bottom}
      width={FAB_SIZE}
      height={FAB_SIZE}
      borderRadius={RADIUS.full}
      backgroundColor="$background"
      pressStyle={{ backgroundColor: '$backgroundPress' }}
      alignItems="center"
      justifyContent="center"
      onPress={onPress}
      accessible
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      {...themedElevation('float', colorScheme)}
    >
      <PlusIcon size={24} weight="bold" color={colors.onPrimaryFill} />
    </XStack>
  );
}
