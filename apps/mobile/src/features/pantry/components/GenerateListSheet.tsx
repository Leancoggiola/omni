// tamagui-ignore
import { formatPantryQuantity } from '@omni/shared/pantry';
import { FONT_SIZE, SPACING } from '@omni/shared/theme';
import { useState } from 'react';
import { Paragraph, XStack, YStack } from 'tamagui';

import { Badge, Banner, Button, FormSheet, getErrorMessage } from '@/shared/ui';

import { CategoryTile } from './CategoryTile';

import type { GeneratePreviewRow } from '@omni/shared/pantry';

type GenerateListSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rows: GeneratePreviewRow[];
  onConfirm: () => Promise<void>;
  onClosed?: () => void;
};

type FormProps = Pick<GenerateListSheetProps, 'rows' | 'onConfirm'> & {
  submitting: boolean;
  onSubmittingChange: (submitting: boolean) => void;
  onDone: () => void;
};

function GenerateListForm({ rows, onConfirm, submitting, onSubmittingChange, onDone }: FormProps) {
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    onSubmittingChange(true);
    setError(null);
    try {
      await onConfirm();
      onDone();
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo generar la lista'));
      onSubmittingChange(false);
    }
  };

  return (
    <YStack gap={SPACING.md}>
      <Paragraph color="$dimmed" fontSize={FONT_SIZE.md}>
        Se suman los productos que están en su mínimo o por debajo. Si ya estaban en la lista, se actualiza la cantidad.
      </Paragraph>
      {error ? <Banner color="destructive">{error}</Banner> : null}
      <YStack gap={SPACING.sm}>
        {rows.map(({ product, quantityToBuy, alreadyListed }) => (
          <XStack key={product.id} gap={SPACING.sm} alignItems="center">
            <CategoryTile category={product.category} isLowStock />
            <YStack flex={1}>
              <Paragraph fontWeight="600" numberOfLines={1}>
                {product.name}
              </Paragraph>
              <Paragraph color="$dimmed" fontSize={FONT_SIZE.sm}>
                {`En alacena: ${formatPantryQuantity(product.quantity, product.unit)} · mínimo ${product.minQuantity}`}
              </Paragraph>
            </YStack>
            <YStack alignItems="flex-end" gap={SPACING['3xs']}>
              <Badge color={alreadyListed ? 'dimmed' : 'accent'}>{alreadyListed ? 'Ya en la lista' : 'Nuevo'}</Badge>
              <Paragraph fontSize={FONT_SIZE.sm} fontWeight="600">
                {`Comprar ${formatPantryQuantity(quantityToBuy, product.unit)}`}
              </Paragraph>
            </YStack>
          </XStack>
        ))}
      </YStack>
      <Button
        fullWidth
        size="lg"
        loading={submitting}
        disabled={rows.length === 0}
        onPress={() => void handleConfirm()}
      >
        Generar lista
      </Button>
    </YStack>
  );
}

/** Vista previa de "Generar desde bajo stock": qué se suma o se actualiza antes de tocar la lista (= web). */
export function GenerateListSheet({ open, onOpenChange, rows, onConfirm, onClosed }: GenerateListSheetProps) {
  const [submitting, setSubmitting] = useState(false);

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Generar desde bajo stock"
      busy={submitting}
      onClosed={onClosed}
    >
      <GenerateListForm
        rows={rows}
        onConfirm={onConfirm}
        submitting={submitting}
        onSubmittingChange={setSubmitting}
        onDone={() => {
          setSubmitting(false);
          onOpenChange(false);
        }}
      />
    </FormSheet>
  );
}
