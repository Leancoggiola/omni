import { FONT_SIZE, RADIUS, SIZE, SPACING } from '@omni/shared/theme';
import { UserPlusIcon } from 'phosphor-react-native';
import { Paragraph, XStack } from 'tamagui';

import { useColorSchemeControl, useSemanticColors } from '@/core/theme';
import { themedElevation } from '@/theme/elevation';

export const FAB_SIZE = SIZE.fab;

type CreateUserFabProps = {
  onPress: () => void;
};

/** FAB extendido "Crear usuario" (en web es el botón del `PageHeader`; el canvas mobile lo lleva con texto): filled de marca de alto `SIZE.fab`. */
export function CreateUserFab({ onPress }: CreateUserFabProps) {
  const colors = useSemanticColors();
  const { colorScheme } = useColorSchemeControl();

  return (
    <XStack
      theme="active"
      position="absolute"
      right={SPACING.md}
      bottom={SPACING.md}
      paddingHorizontal={SPACING.lg}
      gap={SPACING.xs}
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
      <UserPlusIcon size={20} weight="bold" color={colors.onPrimaryFill} />
      <Paragraph color={colors.onPrimaryFill} fontSize={FONT_SIZE.md} fontWeight="600">
        Crear usuario
      </Paragraph>
    </XStack>
  );
}
