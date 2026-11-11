import { SIZE, SPACING } from '@omni/shared/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Distancia de la tab bar flotante al borde inferior: 24, o el inset del sistema si es mayor (barra de 3 botones). */
export function tabBarBottomOffset(insetBottom: number) {
  return Math.max(insetBottom, SPACING.xl);
}

/**
 * Lo que las pantallas de tab reservan abajo para no quedar tapadas por la tab bar flotante: su alto, su distancia
 * al borde y un aire de `md`.
 */
export function useTabBarClearance() {
  const insets = useSafeAreaInsets();

  return SIZE.tabBar + tabBarBottomOffset(insets.bottom) + SPACING.md;
}
