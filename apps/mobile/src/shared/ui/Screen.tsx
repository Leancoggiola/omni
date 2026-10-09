import { SPACING } from '@omni/shared/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { YStack } from 'tamagui';

import type { ReactNode } from 'react';

type ScreenProps = {
  children: ReactNode;
  /**
   * Las tabs no tienen header de navegación: la pantalla deja lugar a la status bar. Debajo de un
   * header de stack (Perfil) ese espacio ya lo ocupa el header.
   */
  insetTop?: boolean;
  /**
   * Con tab bar, ella cubre la barra de navegación del sistema. Las rutas de stack no la tienen y la
   * app es edge-to-edge: sin este inset el final del contenido queda debajo de la barra.
   */
  insetBottom?: boolean;
};

/** Contenedor de pantalla: fondo del tema y márgenes de la app. El primer hijo suele ser `ScreenHeader`. */
export function Screen({ children, insetTop = true, insetBottom = false }: ScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <YStack
      flex={1}
      backgroundColor="$background"
      paddingHorizontal={SPACING.md}
      paddingTop={(insetTop ? insets.top : 0) + SPACING.md}
      paddingBottom={insetBottom ? insets.bottom : 0}
      gap={SPACING.md}
    >
      {children}
    </YStack>
  );
}
