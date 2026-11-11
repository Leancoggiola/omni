import { FC, useState } from 'react';
import { Alert, Autocomplete, Button, Group, Input, NumberInput, Paper, SegmentedControl } from '@mantine/core';

import { getErrorMessage } from '@/shared/ui';

import { usePantrySuggestions } from '../hooks/usePantrySuggestions';

import type { AddShoppingListItemPayload, PantryUnit } from '@omni/shared/pantry';

import { MagnifyingGlassIcon } from '@phosphor-icons/react';

const UNIT_OPTIONS = [
  { value: 'UNITS', label: 'Unidades' },
  { value: 'PACKAGES', label: 'Paquetes' },
];

interface AddShoppingItemFormProps {
  onAdd: (payload: AddShoppingListItemPayload) => Promise<void>;
}

/**
 * Agregar un ítem a mano: se busca en la alacena (si el nombre coincide con un producto, el ítem queda vinculado y
 * toma su unidad) o se escribe uno libre con su unidad. "Agregar" queda deshabilitado sin nombre o con cantidad 0.
 */
export const AddShoppingItemForm: FC<AddShoppingItemFormProps> = ({ onAdd }) => {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState<number | string>(1);
  const [unit, setUnit] = useState<PantryUnit>('UNITS');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { suggestions } = usePantrySuggestions(name);
  const linked = suggestions.find(suggestion => suggestion.name.toLowerCase() === name.trim().toLowerCase());
  const quantityValue = Number(quantity);
  const canAdd = name.trim() !== '' && quantity !== '' && quantityValue > 0;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canAdd || loading) return;
    setLoading(true);
    setError(null);
    try {
      await onAdd(
        linked
          ? { pantryProductId: linked.id, quantityToBuy: quantityValue }
          : { name: name.trim(), quantityToBuy: quantityValue, unit }
      );
      setName('');
      setQuantity(1);
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo agregar el ítem'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper
      p="md"
      component="form"
      noValidate
      aria-label="Agregar a la lista"
      onSubmit={(e: React.FormEvent) => void handleSubmit(e)}
    >
      {error && (
        <Alert color="destructive" mb="md">
          {error}
        </Alert>
      )}
      <Group gap="md" align="flex-end" wrap="wrap">
        <Autocomplete
          label="Producto"
          placeholder="Buscá en tu alacena o escribí un nombre"
          leftSection={<MagnifyingGlassIcon size="1rem" />}
          data={suggestions.map(suggestion => suggestion.name)}
          filter={({ options }) => options}
          value={name}
          onChange={setName}
          maxLength={120}
          flex="1 1 15rem"
        />
        <NumberInput label="Cantidad" min={1} allowNegative={false} value={quantity} onChange={setQuantity} w="7rem" />
        <Input.Wrapper label="Unidad" w="14rem">
          <SegmentedControl
            fullWidth
            aria-label="Unidad"
            data={UNIT_OPTIONS}
            value={linked ? linked.unit : unit}
            onChange={value => setUnit(value as PantryUnit)}
            disabled={Boolean(linked)}
          />
        </Input.Wrapper>
        <Button type="submit" loading={loading} disabled={!canAdd}>
          Agregar
        </Button>
      </Group>
    </Paper>
  );
};
