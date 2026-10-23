import {
  BarbellIcon,
  DesktopIcon,
  FilmSlateIcon,
  GearIcon,
  HouseIcon,
  PackageIcon,
  UserIcon,
  UsersThreeIcon,
  WalletIcon,
  type Icon,
} from 'phosphor-react-native';

import type { NavKey } from '@omni/shared/navigation';

/** Mismos íconos que `NAV_ICONS` de web (`app/navigation/nav-registry.tsx`). */
export const NAV_ICONS: Record<NavKey, Icon> = {
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
