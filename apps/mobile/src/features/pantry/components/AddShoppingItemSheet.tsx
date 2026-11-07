// tamagui-ignore
import { SPACING } from '@omni/shared/theme';
import { MagnifyingGlassIcon } from 'phosphor-react-native';
import { useState } from 'react';
import { Paragraph, YStack } from 'tamagui';

import { Banner, Button, FormSheet, getErrorMessage, SegmentedControl, TextField } from '@/shared/ui';

import { usePantrySuggestions } from '../hooks/usePantrySuggestions';
import { parseNumberInput } from '../utils/numberInput';

import type { AddShoppingListItemPayload, PantryUnit } from '@omni/shared/pantry';

const UNIT_OPTIONS = [
  { value: 'UNITS', label: 'Unidades' },
  { value: 'PACKAGES', label: 'Paquetes' },
] as const;

type AddShoppingItemSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (payload: AddShoppingListItemPayload) => Promise<void>;
  onClosed?: () => void;
};

type FormProps = Pick<AddShoppingItemSheetProps, 'onAdd'> & {
  submitting: boolean;
  onSubmittingChange: (submitting: boolean) => void;
  onDone: () => void;
};

/**
 * Agregar un ítem a mano: se busca en la alacena (si el nombre coincide con un producto, el ítem queda vinculado y
 * toma su unidad) o se escribe uno libre con su unidad. "Agregar" queda deshabilitado sin nombre o con cantidad 0.
 */
function AddShoppingItemForm({ onAdd, submitting, onSubmittingChange, onDone }: FormProps) {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState<PantryUnit>('UNITS');
  const [error, setError] = useState<string | null>(null);

  const { suggestions } = usePantrySuggestions(name);
  const trimmed = name.trim().toLowerCase();
  const linked = suggestions.find(suggestion => suggestion.name.toLowerCase() === trimmed);
  const options = suggestions.filter(suggestion => suggestion.name.toLowerCase() !== trimmed);
  const value = parseNumberInput(quantity);
  const canAdd = name.trim() !== '' && value !== '' && value > 0;

  const handleSubmit = async () => {
    if (!canAdd || submitting) return;
    onSubmittingChange(true);
    setError(null);
    try {
      await onAdd(
        linked
          ? { pantryProductId: linked.id, quantityToBuy: value }
          : { name: name.trim(), quantityToBuy: value, unit }
      );
      onDone();
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo agregar el ítem'));
      onSubmittingChange(false);
    }
  };

  return (
    <YStack gap={SPACING.md}>
      {error ? <Banner color="destructive">{error}</Banner> : null}
      <TextField
        label="Producto"
        placeholder="Buscá en tu alacena o escribí un nombre"
        leftSection={MagnifyingGlassIcon}
        maxLength={120}
        value={name}
        onChangeText={setName}
        autoCorrect={false}
      />
      {options.length > 0 ? (
        <YStack gap={SPACING['2xs']} accessibilityRole="list" accessibilityLabel="Sugerencias de tu alacena">
          {options.map(suggestion => (
            <YStack
              key={suggestion.id}
              paddingVertical={SPACING.xs}
              onPress={() => setName(suggestion.name)}
              pressStyle={{ opacity: 0.6 }}
              accessible
              accessibilityRole="button"
              accessibilityLabel={`Usar ${suggestion.name}`}
            >
              <Paragraph fontWeight="600">{suggestion.name}</Paragraph>
            </YStack>
          ))}
        </YStack>
      ) : null}
      {linked ? <Paragraph color="$dimmed">Está en tu alacena: se vincula y toma su unidad.</Paragraph> : null}
      <TextField label="Cantidad" keyboardType="decimal-pad" value={quantity} onChangeText={setQuantity} />
      <YStack gap={SPACING['2xs']}>
        <Paragraph fontWeight="600">Unidad</Paragraph>
        <SegmentedControl
          data={UNIT_OPTIONS}
          value={linked ? linked.unit : unit}
          onChange={setUnit}
          disabled={Boolean(linked)}
          accessibilityLabel="Unidad"
        />
      </YStack>
      <Button fullWidth size="lg" loading={submitting} disabled={!canAdd} onPress={() => void handleSubmit()}>
        Agregar
      </Button>
    </YStack>
  );
}

/** Hoja para agregar un ítem a la lista de compras (en web es el formulario de arriba de la lista). */
export function AddShoppingItemSheet({ open, onOpenChange, onAdd, onClosed }: AddShoppingItemSheetProps) {
  const [submitting, setSubmitting] = useState(false);

  return (
    <FormSheet open={open} onOpenChange={onOpenChange} title="Agregar a la lista" busy={submitting} onClosed={onClosed}>
      <AddShoppingItemForm
        onAdd={onAdd}
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
