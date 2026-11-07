import { FC } from 'react';
import { ThemeIcon } from '@mantine/core';

import type { PantryCategory } from '@omni/shared/pantry';
import type { Icon } from '@phosphor-icons/react';

import {
  BeerBottleIcon,
  CarrotIcon,
  CheeseIcon,
  CookieIcon,
  CowIcon,
  GrainsIcon,
  JarIcon,
  OrangeIcon,
  SnowflakeIcon,
  SprayBottleIcon,
} from '@phosphor-icons/react';

const CATEGORY_ICONS: Record<PantryCategory, Icon> = {
  DAIRY: CheeseIcon,
  MEAT: CowIcon,
  FRUIT: OrangeIcon,
  VEGETABLE: CarrotIcon,
  GRAINS: GrainsIcon,
  BEVERAGES: BeerBottleIcon,
  SNACKS: CookieIcon,
  CONDIMENTS: JarIcon,
  FROZEN: SnowflakeIcon,
  CLEANING: SprayBottleIcon,
};

interface CategoryTileProps {
  category: PantryCategory;
  isLowStock?: boolean;
  isExpiringSoon?: boolean;
  size?: string;
}

/** Ícono de la categoría en un recuadro: terracota si el producto está bajo de stock, ámbar si está por vencer. */
export const CategoryTile: FC<CategoryTileProps> = ({ category, isLowStock, isExpiringSoon, size = '2.75rem' }) => {
  const CategoryIcon = CATEGORY_ICONS[category];
  const color = isLowStock ? 'terracotta' : isExpiringSoon ? 'warning' : 'gray';

  return (
    <ThemeIcon
      variant={color === 'warning' ? 'outline' : 'light'}
      color={color}
      size={size}
      radius="md"
      aria-hidden="true"
    >
      <CategoryIcon size="1.375rem" />
    </ThemeIcon>
  );
};
