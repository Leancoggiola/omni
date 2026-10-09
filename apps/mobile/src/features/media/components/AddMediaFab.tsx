import { RADIUS, SPACING } from '@omni/shared/theme';
import { PlusIcon } from 'phosphor-react-native';
import { XStack } from 'tamagui';

import { useSemanticColors } from '@/core/theme';
import { elevation } from '@/theme/elevation';

export const FAB_SIZE = 56;

type AddMediaFabProps = {
  onPress: () => void;
};

/**
 * Botón flotante de "Agregar" (en web es el botón del `PageHeader`). Filled de marca, como el Button
 * de `@/shared/ui`. Si otra pantalla lo necesita, pasa a `@/shared/ui`.
 */
export function AddMediaFab({ onPress }: AddMediaFabProps) {
  const colors = useSemanticColors();

  return (
    <XStack
      theme="active"
      position="absolute"
      right={SPACING.md}
      bottom={SPACING.md}
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
      {...elevation('md')}
    >
      <PlusIcon size={24} weight="bold" color={colors.onPrimaryFill} />
    </XStack>
  );
}
