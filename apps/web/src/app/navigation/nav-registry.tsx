import { homeNavItem } from '@/features/home';
import { mediaNavItem } from '@/features/media';
import { profileNavItem } from '@/features/profile';
import { splitExpensesNavItem } from '@/features/split-expenses';

import type { NavItemConfig } from '@/layouts/navConfig';

import { BarbellIcon, DesktopIcon, GearIcon, PackageIcon, WalletIcon } from '@phosphor-icons/react';

const iconSize = '1.25rem';

/** Placeholder items for features not yet implemented */
const PLACEHOLDER_NAV_ITEMS: NavItemConfig[] = [
  { label: 'Gimnasio', disabled: true, icon: <BarbellIcon size={iconSize} /> },
  { label: 'Gastos', disabled: true, icon: <WalletIcon size={iconSize} /> },
  { label: 'PC Control', disabled: true, icon: <DesktopIcon size={iconSize} /> },
  { label: 'Alacena', disabled: true, icon: <PackageIcon size={iconSize} /> },
];

export const MAIN_NAV_ORDER = [
  'home',
  'media',
  'gym',
  'expenses',
  'pc-control',
  'pantry',
  'split-expenses',
  'profile',
] as const;

const NAV_BY_KEY: Record<(typeof MAIN_NAV_ORDER)[number], NavItemConfig | undefined> = {
  home: homeNavItem,
  media: mediaNavItem,
  profile: profileNavItem,
  gym: PLACEHOLDER_NAV_ITEMS[0],
  expenses: PLACEHOLDER_NAV_ITEMS[1],
  'pc-control': PLACEHOLDER_NAV_ITEMS[2],
  pantry: PLACEHOLDER_NAV_ITEMS[3],
  'split-expenses': splitExpensesNavItem,
};

export const MAIN_NAV_ITEMS: NavItemConfig[] = MAIN_NAV_ORDER.map(key => NAV_BY_KEY[key]).filter(
  (item): item is NavItemConfig => item != null
);

export const ADMIN_NAV_ITEMS: NavItemConfig[] = [
  { label: 'Administración', disabled: true, icon: <GearIcon size={iconSize} /> },
];
