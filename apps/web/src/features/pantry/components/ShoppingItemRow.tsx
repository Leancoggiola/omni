import { memo } from 'react';
import { ActionIcon, Badge, Checkbox, Group, Text } from '@mantine/core';

import { PantryItemAuthor } from './PantryItemAuthor';

import type { PantryShoppingListItem } from '@omni/shared/pantry';

import { formatPantryQuantity } from '@omni/shared/pantry';
import { PencilSimpleIcon, TrashIcon } from '@phosphor-icons/react';

interface ShoppingItemRowProps {
  item: PantryShoppingListItem;
  showAuthor: boolean;
  busy?: boolean;
  onToggle: (item: PantryShoppingListItem) => void;
  onEdit?: (item: PantryShoppingListItem) => void;
  onRemove?: (item: PantryShoppingListItem) => void;
}

/**
 * Fila de la lista. Pendiente: tilde, "Comprar X", origen (Auto/Manual), stock actual si está vinculada, editar y
 * quitar. Comprada: tilde marcado (al tocarlo se destilda) y la cantidad, atenuada.
 */
export const ShoppingItemRow = memo(function ShoppingItemRow({
  item,
  showAuthor,
  busy,
  onToggle,
  onEdit,
  onRemove,
}: ShoppingItemRowProps) {
  return (
    <Group gap="sm" wrap="nowrap" align="flex-start" py="xs" opacity={item.checked ? 0.7 : 1}>
      <Checkbox
        mt={2}
        checked={item.checked}
        disabled={busy}
        aria-label={item.checked ? `Destildar ${item.name}` : `Marcar ${item.name} como comprado`}
        onChange={() => onToggle(item)}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <Text fw={600} td={item.checked ? 'line-through' : undefined}>
          {item.name}
        </Text>
        <Text size="sm" c="dimmed">
          {item.checked
            ? formatPantryQuantity(item.quantityToBuy, item.unit)
            : `Comprar ${formatPantryQuantity(item.quantityToBuy, item.unit)}`}
        </Text>
        {!item.checked && (
          <Group gap="xs" mt={4} wrap="wrap">
            <Badge size="sm" variant="light" color={item.source === 'AUTO' ? 'gray' : 'terracotta'}>
              {item.source === 'AUTO' ? 'Auto' : 'Manual'}
            </Badge>
            {item.linkedProduct && (
              <Text size="xs" c="dimmed">
                En alacena: {formatPantryQuantity(item.linkedProduct.quantity, item.linkedProduct.unit)}
              </Text>
            )}
            {showAuthor && <PantryItemAuthor createdById={item.createdById} />}
          </Group>
        )}
        {item.checked && showAuthor && <PantryItemAuthor createdById={item.createdById} />}
      </div>
      {!item.checked && onEdit && (
        <ActionIcon variant="subtle" aria-label={`Editar ${item.name}`} onClick={() => onEdit(item)}>
          <PencilSimpleIcon size="1.125rem" />
        </ActionIcon>
      )}
      {!item.checked && onRemove && (
        <ActionIcon
          variant="subtle"
          color="destructive"
          aria-label={`Quitar ${item.name} de la lista`}
          onClick={() => onRemove(item)}
        >
          <TrashIcon size="1.125rem" />
        </ActionIcon>
      )}
    </Group>
  );
});
