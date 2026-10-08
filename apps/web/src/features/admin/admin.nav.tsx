import type { NavItemConfig } from '@/layouts/navConfig';

import { GearIcon } from '@phosphor-icons/react';

const iconSize = '1.25rem';

export const adminNavItem: NavItemConfig = {
  label: 'Administración',
  path: '/admin',
  icon: <GearIcon size={iconSize} />,
};
