import { SPACING } from '@omni/shared/theme';
import { XStack } from 'tamagui';

import { Badge } from '@/shared/ui';

import type { PantryProduct } from '@omni/shared/pantry';

type ProductAlertBadgesProps = {
  product: Pick<PantryProduct, 'isLowStock' | 'isExpiringSoon'>;
};

/** "Bajo stock" y "Por vencer": las alertas que calcula la API para el producto. */
export function ProductAlertBadges({ product }: ProductAlertBadgesProps) {
  if (!product.isLowStock && !product.isExpiringSoon) return null;

  return (
    <XStack gap={SPACING.xs} flexWrap="wrap">
      {product.isLowStock ? <Badge color="accent">Bajo stock</Badge> : null}
      {product.isExpiringSoon ? (
        <Badge color="warning" variant="outline">
          Por vencer
        </Badge>
      ) : null}
    </XStack>
  );
}
