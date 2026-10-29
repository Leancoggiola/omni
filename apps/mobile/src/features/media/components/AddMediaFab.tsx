import { RADIUS, SIZE, SPACING } from '@omni/shared/theme';
import { PlusIcon } from 'phosphor-react-native';
import { XStack } from 'tamagui';

import { useColorSchemeControl, useSemanticColors } from '@/core/theme';
import { useTabBarClearance } from '@/shared/ui';
import { themedElevation } from '@/theme/elevation';

export const FAB_SIZE = SIZE.fab;

type AddMediaFabProps = {
  onPress: () => void;
};

/**
 * Botón flotante de "Agregar" (en web es el botón del `PageHeader`). Filled de marca (`primary-fill`), de `SIZE.fab`,
 * con la sombra `float`. Si otra pantalla lo necesita, pasa a `@/shared/ui`.
 */
export function AddMediaFab({ onPress }: AddMediaFabProps) {
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
      accessibilityLabel="Agregar película o serie"
      {...themedElevation('float', colorScheme)}
    >
      <PlusIcon size={24} weight="bold" color={colors.onPrimaryFill} />
    </XStack>
  );
}
