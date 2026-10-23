import type { NavItemConfig } from '@/layouts/navConfig';
import type { NavKey } from '@omni/shared/navigation';

import { ADMIN_NAV_ORDER, isNavAvailable, MAIN_NAV_ORDER, NAV_REGISTRY } from '@omni/shared/navigation';
import {
  BarbellIcon,
  DesktopIcon,
  FilmSlateIcon,
  GearIcon,
  HouseIcon,
  type Icon,
  PackageIcon,
  UserIcon,
  UsersThreeIcon,
  WalletIcon,
} from '@phosphor-icons/react';

const iconSize = '1.25rem';

/** Mismos íconos que `NAV_ICONS` de mobile. */
const NAV_ICONS: Record<NavKey, Icon> = {
  home: HouseIcon,
  media: FilmSlateIcon,
  gym: BarbellIcon,
  expenses: WalletIcon,
  'pc-control': DesktopIcon,
  pantry: PackageIcon,
  'split-expenses': UsersThreeIcon,
  profile: UserIcon,
  admin: GearIcon,
};

/** Los módulos que web todavía no tiene quedan deshabilitados y sin destino. */
const toNavItem = (key: NavKey): NavItemConfig => {
  const { label, path } = NAV_REGISTRY[key];
  const IconComponent = NAV_ICONS[key];
  const available = isNavAvailable(key, 'web');

  return {
    label,
    path: available ? path : undefined,
    disabled: !available,
    icon: <IconComponent size={iconSize} />,
  };
};

export const MAIN_NAV_ITEMS: NavItemConfig[] = MAIN_NAV_ORDER.map(toNavItem);

export const ADMIN_NAV_ITEMS: NavItemConfig[] = ADMIN_NAV_ORDER.map(toNavItem);
