import { FC, useState } from 'react';
import { Alert, Button, Group, Modal, NumberInput, Stack, Text } from '@mantine/core';

import { getErrorMessage } from '@/shared/ui';

import type { PantryShoppingListItem } from '@omni/shared/pantry';

interface EditShoppingItemModalProps {
  item: PantryShoppingListItem | null;
  onClose: () => void;
  onSave: (item: PantryShoppingListItem, quantityToBuy: number) => Promise<void>;
}

interface EditShoppingItemFormProps {
  item: PantryShoppingListItem;
  loading: boolean;
  onSubmit: (quantityToBuy: number) => Promise<void>;
  onCancel: () => void;
}

/** Cantidad a comprar de un ítem pendiente; "Guardar" se habilita cuando cambia y es mayor que cero. */
const EditShoppingItemForm: FC<EditShoppingItemFormProps> = ({ item, loading, onSubmit, onCancel }) => {
  const [quantity, setQuantity] = useState<number | string>(item.quantityToBuy);
  const [error, setError] = useState<string | null>(null);
  const value = Number(quantity);
  const canSave = quantity !== '' && value > 0 && value !== item.quantityToBuy;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSave || loading) return;
    setError(null);
    try {
      await onSubmit(value);
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo guardar el cambio'));
    }
  };

  return (
    <form noValidate onSubmit={event => void handleSubmit(event)}>
      <Stack gap="md">
        {error && <Alert color="destructive">{error}</Alert>}
        <NumberInput
          label="Cantidad a comprar"
          withAsterisk
          min={1}
          allowNegative={false}
          value={quantity}
          onChange={setQuantity}
          data-autofocus
        />
        <Group justify="flex-end" gap="sm">
          <Button variant="outline" type="button" onClick={onCancel} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" loading={loading} disabled={!canSave}>
            Guardar
          </Button>
        </Group>
      </Stack>
    </form>
  );
};

/** Modal para editar la cantidad de un ítem pendiente de la lista. */
export const EditShoppingItemModal: FC<EditShoppingItemModalProps> = ({ item, onClose, onSave }) => {
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    if (!loading) onClose();
  };

  const handleSubmit = async (quantityToBuy: number) => {
    if (!item) return;
    setLoading(true);
    try {
      await onSave(item, quantityToBuy);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal opened={item !== null} onClose={handleClose} title="Editar ítem" centered closeOnClickOutside={!loading}>
      {item && (
        <Stack gap="md">
          <Text c="dimmed" size="sm">
            {item.name}
          </Text>
          <EditShoppingItemForm item={item} loading={loading} onSubmit={handleSubmit} onCancel={handleClose} />
        </Stack>
      )}
    </Modal>
  );
};
