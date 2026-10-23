import type { NavKey } from '@omni/shared/navigation';
import type { Href } from 'expo-router';

/**
 * Ruta de Expo Router de cada módulo que existe en mobile. Va tipada a mano (no `path as Href`) para
 * que `typedRoutes` falle si la ruta no existe en `app/`. Sumar `"mobile"` a `availableOn` en el
 * registro sin agregar la ruta acá rompe `navHrefs.test.ts`.
 */
export const NAV_HREFS: Partial<Record<NavKey, Href>> = {
  home: '/',
  media: '/media',
  pantry: '/pantry',
  profile: '/profile',
};
