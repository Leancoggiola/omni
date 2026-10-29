import { SPACING } from '@omni/shared/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { YStack } from 'tamagui';

import { AppBackground } from './AppBackground';
import { useTabBarClearance } from './useTabBarClearance';

import type { ReactNode } from 'react';

type ScreenProps = {
  children: ReactNode;
  /**
   * Las rutas de stack no tienen tab bar y la app es edge-to-edge: sin este inset el final del contenido queda
   * debajo de la barra del sistema. Sin `insetBottom` (pantallas de tab) se reserva el lugar de la tab bar flotante.
   */
  insetBottom?: boolean;
};

/**
 * Contenedor de pantalla: canvas del tema con las manchas de v2 (`AppBackground`) y márgenes de la app. Ninguna ruta
 * tiene header nativo, así que siempre deja lugar a la status bar. El primer hijo suele ser `ScreenHeader`.
 */
export function Screen({ children, insetBottom = false }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const tabBarClearance = useTabBarClearance();

  return (
    <YStack
      flex={1}
      backgroundColor="$background"
      paddingHorizontal={SPACING.md}
      paddingTop={insets.top + SPACING.md}
      paddingBottom={insetBottom ? insets.bottom : tabBarClearance}
      gap={SPACING.md}
    >
      <AppBackground />
      {children}
    </YStack>
  );
}
