import type { NavItemConfig } from '@/layouts/navConfig';

import { UsersThreeIcon } from '@phosphor-icons/react';

const iconSize = '1.25rem';

export const splitExpensesNavItem: NavItemConfig = {
  label: 'Dividir gastos',
  path: '/split-expenses',
  icon: <UsersThreeIcon size={iconSize} />,
};
