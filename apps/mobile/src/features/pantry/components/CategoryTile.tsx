import { RADIUS } from '@omni/shared/theme';
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
  type Icon,
} from 'phosphor-react-native';
import { YStack } from 'tamagui';

import { useSemanticColors } from '@/core/theme';

import type { PantryCategory } from '@omni/shared/pantry';

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

const TILE_SIZE = 44;

type CategoryTileProps = {
  category: PantryCategory;
  isLowStock?: boolean;
  isExpiringSoon?: boolean;
};

/**
 * Ícono de la categoría en un recuadro de 44: terracota si el producto está bajo de stock, con borde ámbar si está
 * por vencer (el ámbar es de un solo tono: va como contorno) y neutro si no.
 */
export function CategoryTile({ category, isLowStock = false, isExpiringSoon = false }: CategoryTileProps) {
  const colors = useSemanticColors();
  const CategoryIcon = CATEGORY_ICONS[category];
  const iconColor = isLowStock ? colors.accent : isExpiringSoon ? colors.warning : colors.dimmed;

  return (
    <YStack
      width={TILE_SIZE}
      height={TILE_SIZE}
      borderRadius={RADIUS.md}
      alignItems="center"
      justifyContent="center"
      backgroundColor={isLowStock ? '$accentSurface' : isExpiringSoon ? 'transparent' : '$track'}
      borderWidth={isExpiringSoon && !isLowStock ? 1 : 0}
      borderColor="$warningBorder"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <CategoryIcon size={22} color={iconColor} />
    </YStack>
  );
}
