import { FC, memo } from 'react';
import { ActionIcon, Group, Paper, Table, Text } from '@mantine/core';

import { CategoryTile } from './CategoryTile';
import { ProductAlertBadges } from './ProductAlertBadges';

import type { PantryProduct } from '@omni/shared/pantry';

import { formatExpiryShort, formatPantryQuantity, PANTRY_CATEGORY_LABELS } from '@omni/shared/pantry';
import { PencilSimpleIcon, TrashIcon } from '@phosphor-icons/react';

interface ProductsTableProps {
  products: PantryProduct[];
  onEdit: (product: PantryProduct) => void;
  onDelete: (product: PantryProduct) => void | Promise<void>;
}

interface ProductRowProps extends Omit<ProductsTableProps, 'products'> {
  product: PantryProduct;
}

const ProductRow = memo(function ProductRow({ product, onEdit, onDelete }: ProductRowProps) {
  return (
    <Table.Tr>
      <Table.Td>
        <Group gap="sm" wrap="nowrap">
          <CategoryTile
            category={product.category}
            isLowStock={product.isLowStock}
            isExpiringSoon={product.isExpiringSoon}
          />
          <div>
            <Text fw={600}>{product.name}</Text>
            <Text size="xs" c="dimmed">
              {PANTRY_CATEGORY_LABELS[product.category]}
            </Text>
          </div>
        </Group>
      </Table.Td>
      <Table.Td>
        <Text fw={600}>{formatPantryQuantity(product.quantity, product.unit)}</Text>
        {product.minQuantity !== null && (
          <Text size="xs" c="dimmed">
            mínimo {product.minQuantity}
          </Text>
        )}
      </Table.Td>
      <Table.Td>
        <Text size="sm">{formatExpiryShort(product.expiresAt)}</Text>
      </Table.Td>
      <Table.Td>
        <ProductAlertBadges product={product} />
      </Table.Td>
      <Table.Td>
        <Group gap="xs" justify="flex-end" wrap="nowrap">
          <ActionIcon variant="subtle" aria-label={`Ver y editar ${product.name}`} onClick={() => onEdit(product)}>
            <PencilSimpleIcon size="1.125rem" />
          </ActionIcon>
          <ActionIcon
            variant="subtle"
            color="destructive"
            aria-label={`Eliminar ${product.name}`}
            onClick={() => void onDelete(product)}
          >
            <TrashIcon size="1.125rem" />
          </ActionIcon>
        </Group>
      </Table.Td>
    </Table.Tr>
  );
});

/** Tabla del inventario: producto, cantidad con su mínimo, vencimiento, alertas y acciones. */
export const ProductsTable: FC<ProductsTableProps> = ({ products, onEdit, onDelete }) => (
  <Paper p="none">
    <Table.ScrollContainer minWidth={640}>
      <Table aria-label="Productos" verticalSpacing="sm" horizontalSpacing="md">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Producto</Table.Th>
            <Table.Th>Cantidad</Table.Th>
            <Table.Th>Vencimiento</Table.Th>
            <Table.Th>Alertas</Table.Th>
            <Table.Th ta="right">Acciones</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {products.map(product => (
            <ProductRow key={product.id} product={product} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  </Paper>
);
