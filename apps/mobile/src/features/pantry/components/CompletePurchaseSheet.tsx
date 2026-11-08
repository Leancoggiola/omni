// tamagui-ignore
import { PANTRY_CATEGORIES, PANTRY_CATEGORY_LABELS } from '@omni/shared/pantry';
import { SPACING } from '@omni/shared/theme';
import { useState } from 'react';
import { Paragraph, YStack } from 'tamagui';

import { Banner, Button, FormSheet, getErrorMessage, Select, TextField } from '@/shared/ui';

import { parseNumberInput } from '../utils/numberInput';

import type { CompleteShoppingListItemPayload, PantryCategory, PantryShoppingListItem } from '@omni/shared/pantry';

const CATEGORY_OPTIONS = [
  { value: '', label: 'Elegí una categoría' },
  ...PANTRY_CATEGORIES.map(value => ({ value, label: PANTRY_CATEGORY_LABELS[value] })),
] as const;

type CompletePurchaseSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: PantryShoppingListItem | null;
  onConfirm: (item: PantryShoppingListItem, payload: CompleteShoppingListItemPayload) => Promise<void>;
  onClosed?: () => void;
};

type FormProps = Pick<CompletePurchaseSheetProps, 'onConfirm'> & {
  item: PantryShoppingListItem;
  submitting: boolean;
  onSubmittingChange: (submitting: boolean) => void;
  onDone: () => void;
};

/**
 * Cantidad comprada y, si el ítem no está vinculado a un producto, la categoría donde guardarlo (la API la exige para
 * productos nuevos). "Marcar como comprado" queda deshabilitado hasta que los datos son válidos.
 */
function CompletePurchaseForm({ item, onConfirm, submitting, onSubmittingChange, onDone }: FormProps) {
  const needsCategory = item.pantryProductId === null;
  const [quantity, setQuantity] = useState(String(item.quantityToBuy));
  const [category, setCategory] = useState<PantryCategory | ''>('');
  const [error, setError] = useState<string | null>(null);

  const value = parseNumberInput(quantity);
  const valid = value !== '' && value > 0 && (!needsCategory || category !== '');

  const handleSubmit = async () => {
    if (!valid || submitting) return;
    onSubmittingChange(true);
    setError(null);
    try {
      await onConfirm(item, { quantityPurchased: value, ...(needsCategory && category ? { category } : {}) });
      onDone();
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo marcar como comprado'));
      onSubmittingChange(false);
    }
  };

  return (
    <YStack gap={SPACING.md}>
      <Paragraph color="$dimmed">{item.name}</Paragraph>
      {error ? <Banner color="destructive">{error}</Banner> : null}
      <TextField
        label="Cantidad comprada"
        required
        keyboardType="decimal-pad"
        value={quantity}
        onChangeText={setQuantity}
      />
      {needsCategory ? (
        <YStack gap={SPACING['2xs']}>
          <Paragraph fontWeight="600">Categoría</Paragraph>
          <Select<PantryCategory | ''>
            data={CATEGORY_OPTIONS}
            value={category}
            onChange={setCategory}
            accessibilityLabel="Categoría"
          />
          <Paragraph color="$dimmed">Es un producto nuevo: elegí dónde guardarlo en tu alacena.</Paragraph>
        </YStack>
      ) : null}
      <YStack gap={SPACING.sm}>
        <Button fullWidth size="lg" loading={submitting} disabled={!valid} onPress={() => void handleSubmit()}>
          Marcar como comprado
        </Button>
      </YStack>
    </YStack>
  );
}

/** Hoja "Marcar como comprado" de un ítem de la lista que todavía no está en la alacena (= web). */
export function CompletePurchaseSheet({ open, onOpenChange, item, onConfirm, onClosed }: CompletePurchaseSheetProps) {
  const [submitting, setSubmitting] = useState(false);

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Marcar como comprado"
      busy={submitting}
      onClosed={onClosed}
    >
      {item ? (
        <CompletePurchaseForm
          item={item}
          onConfirm={onConfirm}
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
