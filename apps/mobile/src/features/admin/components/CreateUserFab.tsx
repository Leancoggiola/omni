import { RADIUS, SIZE, SPACING } from '@omni/shared/theme';
import { UserPlusIcon } from 'phosphor-react-native';
import { XStack } from 'tamagui';

import { useColorSchemeControl, useSemanticColors } from '@/core/theme';
import { themedElevation } from '@/theme/elevation';

export const FAB_SIZE = SIZE.fab;

type CreateUserFabProps = {
  onPress: () => void;
};

/** Botón flotante "Crear usuario" (en web es el botón del `PageHeader`); mismo estilo que el de Media. */
export function CreateUserFab({ onPress }: CreateUserFabProps) {
  const colors = useSemanticColors();
  const { colorScheme } = useColorSchemeControl();

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
      accessibilityLabel="Crear usuario"
      {...themedElevation('float', colorScheme)}
    >
      <UserPlusIcon size={24} weight="bold" color={colors.onPrimaryFill} />
    </XStack>
  );
}
