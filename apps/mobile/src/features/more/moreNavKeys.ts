import { MAIN_NAV_ORDER, MOBILE_TAB_KEYS } from '@omni/shared/navigation';

import type { NavKey } from '@omni/shared/navigation';

const TAB_KEYS: readonly NavKey[] = MOBILE_TAB_KEYS;

/** Módulos de "Más": los que no son tab. Perfil se abre desde la tarjeta de usuario. */
export const MORE_NAV_KEYS: NavKey[] = MAIN_NAV_ORDER.filter(key => !TAB_KEYS.includes(key) && key !== 'profile');
