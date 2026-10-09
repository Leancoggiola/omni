import { MOBILE_TAB_KEYS } from '@omni/shared/navigation';
import { SquaresFourIcon } from 'phosphor-react-native';

/**
 * Archivo de ruta de cada tab del registro (`app/(tabs)/<route>.tsx`). `Tabs.Screen name` es un
 * `string` que `typedRoutes` no chequea: `tabs.test.ts` verifica que cada archivo exista.
 */
export const TAB_ROUTES: Record<(typeof MOBILE_TAB_KEYS)[number], string> = {
  home: 'index',
  media: 'media',
  pantry: 'pantry',
};

/** "Más" no es un módulo del registro: label e ícono compartidos por la tab y su pantalla. */
export const MORE_TAB = { route: 'more', label: 'Más', icon: SquaresFourIcon } as const;
