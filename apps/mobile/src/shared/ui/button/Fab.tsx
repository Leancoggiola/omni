import { FONT_SIZE, RADIUS, SIZE, SPACING } from '@omni/shared/theme';
import { PlusIcon, type Icon } from 'phosphor-react-native';
import { Paragraph, XStack } from 'tamagui';

import { useColorSchemeControl, useSemanticColors } from '@/core/theme';
import { themedElevation } from '@/theme/elevation';

import { useFloatingBottom } from '../Screen';

export const FAB_SIZE = SIZE.fab;

type FabProps = {
  onPress: () => void;
  icon?: Icon;
} & ({ label: string; accessibilityLabel?: string } | { label?: undefined; accessibilityLabel: string });

/**
 * Botón flotante de "Agregar" (en web es el botón del `PageHeader`). Filled de marca (`primary-fill`), de alto
 * `SIZE.fab`, con la sombra `float`. Redondo con el ícono, o extendido con `label` ("Crear usuario" en Administración).
 * La distancia al borde la da el `Screen` que lo contiene: sobre la tab bar o sobre la barra del sistema. Sin `label`,
 * `accessibilityLabel` es obligatorio: es lo único que anuncia el lector de pantalla ("Agregar producto").
 */
export function Fab({ onPress, icon: IconComponent = PlusIcon, label, accessibilityLabel }: FabProps) {
  const colors = useSemanticColors();
  const { colorScheme } = useColorSchemeControl();
  const bottom = useFloatingBottom();

  return (
    <XStack
      theme="active"
      position="absolute"
      right={SPACING.md}
      bottom={bottom}
      width={label ? undefined : FAB_SIZE}
      height={FAB_SIZE}
      paddingHorizontal={label ? SPACING.lg : undefined}
      gap={SPACING.xs}
      borderRadius={RADIUS.full}
      backgroundColor="$background"
      pressStyle={{ backgroundColor: '$backgroundPress' }}
      alignItems="center"
      justifyContent="center"
      onPress={onPress}
      accessible
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      {...themedElevation('float', colorScheme)}
    >
      <IconComponent size={label ? 20 : 24} weight="bold" color={colors.onPrimaryFill} />
      {label ? (
        <Paragraph color={colors.onPrimaryFill} fontSize={FONT_SIZE.md} fontWeight="600">
          {label}
        </Paragraph>
      ) : null}
    </XStack>
  );
}
