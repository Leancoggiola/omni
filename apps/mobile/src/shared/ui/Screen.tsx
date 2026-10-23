import { SPACING } from '@omni/shared/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { YStack } from 'tamagui';

import type { ReactNode } from 'react';

type ScreenProps = {
  children: ReactNode;
  /**
   * Con tab bar, ella cubre la barra de navegación del sistema. Las rutas de stack no la tienen y la
   * app es edge-to-edge: sin este inset el final del contenido queda debajo de la barra.
   */
  insetBottom?: boolean;
};

/**
 * Contenedor de pantalla: fondo del tema y márgenes de la app. Ninguna ruta tiene header nativo, así
 * que siempre deja lugar a la status bar. El primer hijo suele ser `ScreenHeader`.
 */
export function Screen({ children, insetBottom = false }: ScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <YStack
      flex={1}
      backgroundColor="$background"
      paddingHorizontal={SPACING.md}
      paddingTop={insets.top + SPACING.md}
      paddingBottom={insetBottom ? insets.bottom : 0}
      gap={SPACING.md}
    >
      {children}
    </YStack>
  );
}
