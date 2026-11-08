import { FC } from 'react';
import { Badge, Group } from '@mantine/core';

import type { PantryProduct } from '@omni/shared/pantry';

interface ProductAlertBadgesProps {
  product: Pick<PantryProduct, 'isLowStock' | 'isExpiringSoon'>;
}

/** "Bajo stock" y "Por vencer": las alertas que calcula la API para el producto. */
export const ProductAlertBadges: FC<ProductAlertBadgesProps> = ({ product }) => (
  <Group gap="xs" wrap="wrap">
    {product.isLowStock && (
      <Badge size="sm" variant="light" color="terracotta">
        Bajo stock
      </Badge>
    )}
    {product.isExpiringSoon && (
      <Badge size="sm" variant="outline" color="warning">
        Por vencer
      </Badge>
    )}
  </Group>
);
