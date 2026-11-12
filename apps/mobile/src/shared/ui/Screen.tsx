import { SPACING } from '@omni/shared/theme';
import { createContext, useContext } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { YStack } from 'tamagui';

import { AppBackground } from './AppBackground';
import { useTabBarClearance } from './useTabBarClearance';

import type { ReactNode } from 'react';

const FloatingBottomContext = createContext<number | null>(null);

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
 * tiene header nativo, así que siempre deja lugar a la status bar. El primer hijo suele ser `ScreenHeader`. Le dice a
 * lo que flota anclado abajo (`Fab`) a qué distancia del borde ir: sobre la tab bar en las tabs y sobre la barra del
 * sistema más `md` en las rutas de stack. Un hijo absoluto no respeta el padding del contenedor, por eso no alcanza con él.
 */
export function Screen({ children, insetBottom = false }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const tabBarClearance = useTabBarClearance();
  const floatingBottom = insetBottom ? insets.bottom + SPACING.md : tabBarClearance;

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
      <FloatingBottomContext.Provider value={floatingBottom}>{children}</FloatingBottomContext.Provider>
    </YStack>
  );
}

/**
 * Distancia al borde inferior para lo que flota anclado abajo dentro de un `Screen` (ver `Screen`). Fuera de uno,
 * la de una pantalla de tab.
 */
export function useFloatingBottom() {
  const fromScreen = useContext(FloatingBottomContext);
  const tabBarClearance = useTabBarClearance();

  return fromScreen ?? tabBarClearance;
}
