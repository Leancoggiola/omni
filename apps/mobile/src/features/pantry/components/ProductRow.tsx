import { formatExpiryShort, formatPantryQuantity, PANTRY_CATEGORY_LABELS } from '@omni/shared/pantry';
import { FONT_SIZE, LINE_HEIGHT, RADIUS, SPACING } from '@omni/shared/theme';
import { CaretRightIcon } from 'phosphor-react-native';
import { memo } from 'react';
import { Paragraph, XStack, YStack } from 'tamagui';

import { useColorSchemeControl, useSemanticColors } from '@/core/theme';
import { glassElevation } from '@/theme/elevation';

import { CategoryTile } from './CategoryTile';
import { ProductAlertBadges } from './ProductAlertBadges';

import type { PantryProduct } from '@omni/shared/pantry';

type ProductRowProps = {
  product: PantryProduct;
  onPress: (product: PantryProduct) => void;
};

/**
 * Fila del inventario: ícono de categoría, nombre, cantidad con su mínimo y vencimiento, y las alertas. Tocarla abre
 * el detalle editable (en web son los íconos de ver y editar de la tabla).
 */
export const ProductRow = memo(function ProductRow({ product, onPress }: ProductRowProps) {
  const { colorScheme } = useColorSchemeControl();
  const colors = useSemanticColors();
  const hasAlerts = product.isLowStock || product.isExpiringSoon;
  const details = [
    formatPantryQuantity(product.quantity, product.unit),
    product.minQuantity !== null ? `mínimo ${product.minQuantity}` : null,
    product.expiresAt ? `vence ${formatExpiryShort(product.expiresAt)}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <XStack
      backgroundColor="$surfaceGlass"
      borderWidth={1}
      borderColor="$glassBorder"
      borderRadius={RADIUS.xl}
      padding={SPACING.sm}
      gap={SPACING.sm}
      alignItems="center"
      onPress={() => onPress(product)}
      pressStyle={{ opacity: 0.8 }}
      accessible
      accessibilityRole="button"
      accessibilityLabel={`${product.name}, ${PANTRY_CATEGORY_LABELS[product.category]}, ${details}`}
      accessibilityHint="Abre el detalle del producto"
      {...glassElevation('card', colorScheme)}
    >
      <CategoryTile
        category={product.category}
        isLowStock={product.isLowStock}
        isExpiringSoon={product.isExpiringSoon}
      />
      <YStack flex={1} gap={SPACING['3xs']}>
        <Paragraph fontSize={FONT_SIZE.lg} lineHeight={LINE_HEIGHT.xl} fontWeight="600" numberOfLines={1}>
          {product.name}
        </Paragraph>
        <Paragraph color="$dimmed" fontSize={FONT_SIZE.sm} numberOfLines={1}>
          {details}
        </Paragraph>
        {hasAlerts ? <ProductAlertBadges product={product} /> : null}
      </YStack>
      <CaretRightIcon size={20} color={colors.dimmed} />
    </XStack>
  );
});
