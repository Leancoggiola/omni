import { formatPantryQuantity } from '@omni/shared/pantry';
import { FONT_SIZE, LINE_HEIGHT, RADIUS, SPACING } from '@omni/shared/theme';
import { CheckIcon, PencilSimpleIcon, TrashIcon } from 'phosphor-react-native';
import { memo } from 'react';
import { Paragraph, XStack, YStack } from 'tamagui';

import { useColorSchemeControl, useSemanticColors } from '@/core/theme';
import { Badge, IconButton } from '@/shared/ui';
import { glassElevation } from '@/theme/elevation';

import { PantryItemAuthor } from './PantryItemAuthor';

import type { PantryShoppingListItem } from '@omni/shared/pantry';

const CHECK_SIZE = 28;

type ShoppingItemRowProps = {
  item: PantryShoppingListItem;
  showAuthor: boolean;
  busy?: boolean;
  onToggle: (item: PantryShoppingListItem) => void;
  onEdit?: (item: PantryShoppingListItem) => void;
  onRemove?: (item: PantryShoppingListItem) => void;
};

/**
 * Fila de la lista. Pendiente: tilde, "Comprar X", origen (Auto/Manual), stock actual si está vinculada, editar y
 * quitar. Comprada: tilde marcado (al tocarlo se destilda) y la cantidad, atenuada.
 */
export const ShoppingItemRow = memo(function ShoppingItemRow({
  item,
  showAuthor,
  busy = false,
  onToggle,
  onEdit,
  onRemove,
}: ShoppingItemRowProps) {
  const { colorScheme } = useColorSchemeControl();
  const colors = useSemanticColors();
  const quantity = formatPantryQuantity(item.quantityToBuy, item.unit);

  return (
    <XStack
      backgroundColor="$surfaceGlass"
      borderWidth={1}
      borderColor="$glassBorder"
      borderRadius={RADIUS.xl}
      padding={SPACING.sm}
      gap={SPACING.sm}
      alignItems="center"
      opacity={item.checked ? 0.7 : 1}
      {...glassElevation('card', colorScheme)}
    >
      <YStack
        width={CHECK_SIZE}
        height={CHECK_SIZE}
        borderRadius={CHECK_SIZE / 2}
        borderWidth={2}
        borderColor={item.checked ? '$primary' : '$borderColor'}
        backgroundColor={item.checked ? '$primary' : 'transparent'}
        alignItems="center"
        justifyContent="center"
        hitSlop={SPACING.xs}
        onPress={busy ? undefined : () => onToggle(item)}
        accessible
        accessibilityRole="checkbox"
        accessibilityLabel={item.checked ? `Destildar ${item.name}` : `Marcar ${item.name} como comprado`}
        accessibilityState={{ checked: item.checked, disabled: busy }}
      >
        {item.checked ? <CheckIcon size={16} weight="bold" color={colors.onPrimaryFill} /> : null}
      </YStack>
      <YStack flex={1} gap={SPACING['3xs']}>
        <Paragraph
          fontSize={FONT_SIZE.lg}
          lineHeight={LINE_HEIGHT.xl}
          fontWeight="600"
          textDecorationLine={item.checked ? 'line-through' : 'none'}
          numberOfLines={2}
        >
          {item.name}
        </Paragraph>
        <Paragraph color="$dimmed" fontSize={FONT_SIZE.sm}>
          {item.checked ? quantity : `Comprar ${quantity}`}
        </Paragraph>
        {item.checked ? null : (
          <XStack gap={SPACING.xs} alignItems="center" flexWrap="wrap">
            <Badge color={item.source === 'AUTO' ? 'dimmed' : 'accent'}>
              {item.source === 'AUTO' ? 'Auto' : 'Manual'}
            </Badge>
            {item.linkedProduct ? (
              <Paragraph color="$dimmed" fontSize={FONT_SIZE.xs}>
                {`En alacena: ${formatPantryQuantity(item.linkedProduct.quantity, item.linkedProduct.unit)}`}
              </Paragraph>
            ) : null}
          </XStack>
        )}
        {showAuthor ? <PantryItemAuthor createdById={item.createdById} updatedById={item.updatedById} /> : null}
      </YStack>
      {!item.checked && onEdit ? (
        <IconButton
          icon={PencilSimpleIcon}
          size="sm"
          accessibilityLabel={`Editar ${item.name}`}
          onPress={() => onEdit(item)}
        />
      ) : null}
      {!item.checked && onRemove ? (
        <IconButton
          icon={TrashIcon}
          size="sm"
          color="destructive"
          accessibilityLabel={`Quitar ${item.name} de la lista`}
          onPress={() => onRemove(item)}
        />
      ) : null}
    </XStack>
  );
});
