// tamagui-ignore
import { SPACING } from '@omni/shared/theme';
import { useState } from 'react';
import { Paragraph, YStack } from 'tamagui';

import { Banner, Button, FormSheet, getErrorMessage, TextField } from '@/shared/ui';

import { parseNumberInput } from '../utils/numberInput';

import type { PantryShoppingListItem } from '@omni/shared/pantry';

type EditShoppingItemSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: PantryShoppingListItem | null;
  onSave: (item: PantryShoppingListItem, quantityToBuy: number) => Promise<void>;
  onClosed?: () => void;
};

type FormProps = Pick<EditShoppingItemSheetProps, 'onSave'> & {
  item: PantryShoppingListItem;
  submitting: boolean;
  onSubmittingChange: (submitting: boolean) => void;
  onDone: () => void;
};

/** Cantidad a comprar de un ítem pendiente; "Guardar" se habilita cuando cambia y es mayor que cero. */
function EditShoppingItemForm({ item, onSave, submitting, onSubmittingChange, onDone }: FormProps) {
  const [quantity, setQuantity] = useState(String(item.quantityToBuy));
  const [error, setError] = useState<string | null>(null);
  const value = parseNumberInput(quantity);
  const canSave = value !== '' && value > 0 && value !== item.quantityToBuy;

  const handleSubmit = async () => {
    if (!canSave || submitting) return;
    onSubmittingChange(true);
    setError(null);
    try {
      await onSave(item, value);
      onDone();
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo guardar el cambio'));
      onSubmittingChange(false);
    }
  };

  return (
    <YStack gap={SPACING.md}>
      <Paragraph color="$dimmed">{item.name}</Paragraph>
      {error ? <Banner color="destructive">{error}</Banner> : null}
      <TextField
        label="Cantidad a comprar"
        required
        keyboardType="decimal-pad"
        value={quantity}
        onChangeText={setQuantity}
      />
      <Button fullWidth size="lg" loading={submitting} disabled={!canSave} onPress={() => void handleSubmit()}>
        Guardar
      </Button>
    </YStack>
  );
}

/** Hoja para editar la cantidad de un ítem pendiente de la lista (= `EditShoppingItemModal` de web). */
export function EditShoppingItemSheet({ open, onOpenChange, item, onSave, onClosed }: EditShoppingItemSheetProps) {
  const [submitting, setSubmitting] = useState(false);

  return (
    <FormSheet open={open} onOpenChange={onOpenChange} title="Editar ítem" busy={submitting} onClosed={onClosed}>
      {item ? (
        <EditShoppingItemForm
          item={item}
          onSave={onSave}
          submitting={submitting}
          onSubmittingChange={setSubmitting}
          onDone={() => {
            setSubmitting(false);
            onOpenChange(false);
          }}
        />
      ) : null}
    </FormSheet>
  );
}
